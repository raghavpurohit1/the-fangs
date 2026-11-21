/**
 * Delivery adapters only. The caller must persist a unique job, recheck the
 * recipient's current consent/contact, and claim the job before invoking one.
 * `sent` means the provider accepted the request, NOT confirmed delivery/read.
 * `unknown` must not be automatically retried, especially for SMS.
 *
 * Official API references reviewed 2026-11-21:
 * https://resend.com/docs/api-reference/emails/send-email
 * https://resend.com/docs/dashboard/emails/idempotency-keys
 * https://www.twilio.com/docs/messaging/api/message-resource
 * https://www.twilio.com/docs/usage/requests-to-twilio
 */
export interface CommunicationsEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
}

export interface DeliveryResult {
  providerId: string | null;
  status: 'sent' | 'failed' | 'unconfigured' | 'unknown';
  error?: string;
}

const TIMEOUT_MS = 8_000;
const EMAIL_ENDPOINT = 'https://api.resend.com/emails';
const E164 = /^\+[1-9]\d{7,14}$/;
const ACCOUNT_SID = /^AC[0-9a-fA-F]{32}$/;
const MESSAGE_SID = /^(?:SM|MM)[0-9a-fA-F]{32}$/;
const failed = (error: string): DeliveryResult => ({ providerId: null, status: 'failed', error });
const unconfigured = (channel: string): DeliveryResult => ({ providerId: null, status: 'unconfigured', error: `${channel} delivery is not configured.` });
const uncertain = (channel: string, providerId: string | null = null): DeliveryResult => ({
  providerId,
  status: 'unknown',
  error: `${channel} submission could not be confirmed. Check provider records before trying again.`,
});
const secretIsValid = (value: string) => /^[\x21-\x7e]{1,1024}$/.test(value);
const keyIsValid = (value: string) => typeof value === 'string' && /^[a-zA-Z0-9._:/-]{1,256}$/.test(value);
const emailIsValid = (value: string) => typeof value === 'string' && value.length <= 254 && /^[^\s@<>,;\x00-\x1f]+@[^\s@<>,;\x00-\x1f]+\.[^\s@<>,;\x00-\x1f]+$/.test(value);
function senderIsValid(value: string): boolean {
  if (/[\r\n\x00]/.test(value) || value.length > 320) return false;
  if (emailIsValid(value)) return true;
  const named = value.match(/^[^<>]+<([^<>]+)>$/);
  return !!named && emailIsValid(named[1]);
}
function safeHttpFailure(channel: string, status: number): DeliveryResult {
  // A server failure or timeout response may follow a successful submission.
  // Do not present it as a definite non-send that can safely be retried.
  if (status >= 500 || status === 408) return uncertain(channel);
  return failed(`${channel} provider rejected the request (HTTP ${status}).`);
}

/** Plain-text email, one recipient, one attempt, fixed HTTPS endpoint. */
export async function sendEmail(
  env: CommunicationsEnv,
  recipient: string,
  subject: string,
  body: string,
  idempotencyKey: string,
): Promise<DeliveryResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return unconfigured('Email');
  if (!secretIsValid(apiKey) || !senderIsValid(from)) return failed('Email provider configuration is invalid.');
  if (!emailIsValid(recipient)) return failed('A valid single recipient email address is required.');
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 200 || /[\r\n\x00]/.test(subject)) return failed('Email subject must be 1–200 characters without line breaks.');
  if (typeof body !== 'string' || !body.trim() || body.length > 20_000 || body.includes('\0')) return failed('Email body must be 1–20000 characters.');
  if (!keyIsValid(idempotencyKey)) return failed('A valid delivery identifier is required.');

  try {
    const response = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Resend retains idempotency keys for 24 hours. The queue must also
        // prevent repeat delivery after that provider window has expired.
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ from, to: [recipient], subject, text: body }),
    });
    if (!response.ok) return safeHttpFailure('Email', response.status);
    const result: unknown = await response.json();
    const providerId = result && typeof result === 'object' && 'id' in result ? result.id : null;
    if (typeof providerId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(providerId)) return uncertain('Email');
    return { providerId, status: 'sent' };
  } catch {
    // Never reflect a fetch error: it can contain a URL, contact, or secret.
    return uncertain('Email');
  }
}

/**
 * SMS through Twilio's Messages API. This API is not assumed to honor an
 * outbound idempotency header. idempotencyKey identifies the caller's durable
 * job only; the caller must atomically claim it and never resend unknown jobs.
 */
export async function sendSms(
  env: CommunicationsEnv,
  to: string,
  body: string,
  idempotencyKey: string,
): Promise<DeliveryResult> {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const from = env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !from) return unconfigured('SMS');
  if (!ACCOUNT_SID.test(accountSid) || !secretIsValid(authToken) || !E164.test(from)) return failed('SMS provider configuration is invalid.');
  if (typeof to !== 'string' || !E164.test(to)) return failed('An international phone number in E.164 format is required.');
  // This application deliberately caps SMS copy. Long/Unicode messages may
  // still span multiple billable segments; this is not a one-segment promise.
  if (typeof body !== 'string' || !body.trim() || body.length > 1_600 || body.includes('\0')) return failed('SMS body must be 1–1600 characters.');
  if (!keyIsValid(idempotencyKey)) return failed('A valid delivery identifier is required.');

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    if (!response.ok) return safeHttpFailure('SMS', response.status);
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object') return uncertain('SMS');
    const record = result as Record<string, unknown>;
    const providerId = typeof record.sid === 'string' && MESSAGE_SID.test(record.sid) ? record.sid : null;
    if (!providerId) return uncertain('SMS');
    if (['failed', 'undelivered', 'canceled'].includes(String(record.status)) || record.error_code != null) {
      return { providerId, status: 'failed', error: 'SMS provider reported that the message was not sent.' };
    }
    if (!['accepted', 'queued', 'sending', 'sent', 'delivered'].includes(String(record.status))) return uncertain('SMS', providerId);
    return { providerId, status: 'sent' };
  } catch {
    // A timeout can occur after Twilio accepted the message. No automatic retry.
    return uncertain('SMS');
  }
}
