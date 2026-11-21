import assert from 'node:assert/strict';
import test from 'node:test';
import { sendEmail, sendSms, type CommunicationsEnv } from '../src/communications.ts';

// These are synthetic credentials and reserved example contacts. Every fetch
// in this file is mocked; no provider account or network is used.
const env: CommunicationsEnv = {
  RESEND_API_KEY: 're_fake_test_key',
  EMAIL_FROM: 'NextStep <updates@example.org>',
  TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32),
  TWILIO_AUTH_TOKEN: 'synthetic_test_token',
  TWILIO_FROM_NUMBER: '+15550000001',
};
const recipient = 'learner@example.org';
const phone = '+15550000002';
const sid = 'SM' + 'b'.repeat(32);
const emailId = '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794';

test('delivery adapters use fixed provider APIs and preserve honest send states', async (t) => {
  await t.test('missing configuration does not attempt either provider', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network must not run'); });
    assert.equal((await sendEmail({}, recipient, 'Hello', 'Welcome.', 'job-1')).status, 'unconfigured');
    assert.equal((await sendSms({}, phone, 'Welcome.', 'job-2')).status, 'unconfigured');
    assert.equal(network.mock.callCount(), 0);
  });

  await t.test('Resend sends plain text to one recipient with its documented idempotency header', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async (input, init) => {
      assert.equal(input, 'https://api.resend.com/emails');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.redirect, 'error');
      assert.ok(init?.signal instanceof AbortSignal);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'Bearer re_fake_test_key');
      assert.equal(headers.get('Idempotency-Key'), 'email/job-3');
      const payload = JSON.parse(String(init?.body));
      assert.deepEqual(payload, { from: env.EMAIL_FROM, to: [recipient], subject: 'Your next step', text: 'A literal <tag> and a newline\nStay curious.' });
      assert.equal(payload.html, undefined);
      return Response.json({ id: emailId });
    });
    assert.deepEqual(await sendEmail(env, recipient, 'Your next step', 'A literal <tag> and a newline\nStay curious.', 'email/job-3'), { providerId: emailId, status: 'sent' });
    assert.equal(network.mock.callCount(), 1);
  });

  await t.test('Twilio uses a validated account path, Basic auth, and form encoding', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async (input, init) => {
      assert.equal(input, `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`);
      assert.equal(init?.redirect, 'error');
      assert.ok(init?.signal instanceof AbortSignal);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Content-Type'), 'application/x-www-form-urlencoded');
      assert.equal(headers.get('Authorization'), 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`));
      assert.equal(headers.has('Idempotency-Key'), false);
      const payload = new URLSearchParams(String(init?.body));
      assert.equal(payload.get('To'), phone);
      assert.equal(payload.get('From'), env.TWILIO_FROM_NUMBER);
      assert.equal(payload.get('Body'), 'Your Q&A starts soon.');
      return Response.json({ sid, status: 'queued', error_code: null }, { status: 201 });
    });
    assert.deepEqual(await sendSms(env, phone, 'Your Q&A starts soon.', 'sms/job-4'), { providerId: sid, status: 'sent' });
    assert.equal(network.mock.callCount(), 1);
  });

  await t.test('invalid destinations, injection attempts, and long messages make no network call', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network must not run'); });
    assert.equal((await sendEmail(env, 'one@example.org,two@example.org', 'Hello', 'Body', 'job')).status, 'failed');
    assert.equal((await sendEmail(env, recipient, 'Hello\r\nBcc: other@example.org', 'Body', 'job')).status, 'failed');
    assert.equal((await sendEmail(env, recipient, 'Hello', 'Body', 'job\r\nHeader: value')).status, 'failed');
    assert.equal((await sendEmail({ ...env, EMAIL_FROM: 'Name <one@example.org>\nBcc: other@example.org' }, recipient, 'Hello', 'Body', 'job')).status, 'failed');
    assert.equal((await sendSms({ ...env, TWILIO_ACCOUNT_SID: '../redirect' }, phone, 'Body', 'job')).status, 'failed');
    assert.equal((await sendSms(env, 'https://attacker.example', 'Body', 'job')).status, 'failed');
    assert.equal((await sendSms(env, phone, 'x'.repeat(1601), 'job')).status, 'failed');
    assert.equal(network.mock.callCount(), 0);
  });

  await t.test('provider rejection returns only a safe status, never its message or contact', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ message: `private ${recipient} re_fake_test_key`, code: 21211 }, { status: 400 }));
    for (const result of [await sendEmail(env, recipient, 'Hello', 'Private body', 'job-5'), await sendSms(env, phone, 'Private body', 'job-6')]) {
      assert.equal(result.status, 'failed');
      assert.match(result.error || '', /HTTP 400/);
      assert.doesNotMatch(JSON.stringify(result), /learner@example|re_fake|Private body|155500/);
    }
  });

  await t.test('ambiguous network timeout has unknown status and never retries SMS', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => { throw new DOMException(`private ${phone} synthetic_test_token`, 'TimeoutError'); });
    const result = await sendSms(env, phone, 'Private body', 'job-7');
    assert.equal(result.status, 'unknown');
    assert.equal(result.providerId, null);
    assert.equal(network.mock.callCount(), 1);
    assert.doesNotMatch(JSON.stringify(result), /155500|synthetic_test_token|Private body/);
  });

  await t.test('email network uncertainty is also not reported as a definite failure', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Connection closed'); });
    assert.equal((await sendEmail(env, recipient, 'Hello', 'Body', 'job-8')).status, 'unknown');
    assert.equal(network.mock.callCount(), 1);
  });

  await t.test('HTTP server failures remain unknown and rate rejection stays failed', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
    assert.equal((await sendSms(env, phone, 'Body', 'job-9')).status, 'unknown');
    network.mock.mockImplementation(async () => new Response('', { status: 429 }));
    assert.equal((await sendSms(env, phone, 'Body', 'job-10')).status, 'failed');
    assert.equal(network.mock.callCount(), 2);
  });

  await t.test('malformed or incomplete success responses are unknown', async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => new Response('not json', { status: 201 }));
    assert.equal((await sendSms(env, phone, 'Body', 'job-11')).status, 'unknown');
    network.mock.mockImplementation(async () => Response.json({ status: 'queued' }, { status: 201 }));
    assert.equal((await sendSms(env, phone, 'Body', 'job-12')).status, 'unknown');
    network.mock.mockImplementation(async () => Response.json({ success: true }));
    assert.equal((await sendEmail(env, recipient, 'Hello', 'Body', 'job-13')).status, 'unknown');
  });

  await t.test('Twilio explicit failure is retained even with a valid message SID', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ sid, status: 'failed', error_code: 30003, error_message: 'Private detail' }, { status: 201 }));
    const result = await sendSms(env, phone, 'Body', 'job-14');
    assert.equal(result.status, 'failed');
    assert.equal(result.providerId, sid);
    assert.doesNotMatch(result.error || '', /Private detail/);
  });
});
