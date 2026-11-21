import {AISettingsError, type AISettingsEnv} from './ai-settings';

type Data = Record<string, any>;
const BASE = 'https://api-m.sandbox.paypal.com';
const KEY = 'paypal-sandbox-settings-v1';
const encoder = new TextEncoder();
const fail = (status: number, message: string): never => { throw new AISettingsError(status, message); };
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value));
const decode = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
const credential = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{16,500}$/.test(value);
const providerId = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9]{6,64}$/.test(value);
function minorUnits(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
async function encryptionKey(env: AISettingsEnv) {
  if (!/^[a-f\d]{64}$/i.test(env.AI_SETTINGS_KEY || '')) return fail(503, 'Secure payment settings storage is unavailable.');
  return crypto.subtle.importKey('raw', Uint8Array.from(env.AI_SETTINGS_KEY!.match(/../g)!, h => parseInt(h, 16)), {name: 'AES-GCM'}, false, ['encrypt', 'decrypt']);
}
async function config(env: AISettingsEnv): Promise<Data | null> {
  const row = await env.DB.prepare('SELECT value FROM meta WHERE key=?').bind(KEY).first<{value: string}>();
  if (!row) return null;
  try {
    if (row.value.length > 5000) throw new Error();
    const saved = JSON.parse(row.value);
    const raw = await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(saved.iv), additionalData: encoder.encode(KEY)}, await encryptionKey(env), decode(saved.ciphertext));
    const result = JSON.parse(new TextDecoder().decode(raw));
    if (!credential(result.clientId) || !credential(result.secret)) throw new Error();
    return result;
  } catch { return fail(503, 'PayPal settings could not be read. Re-enter the sandbox credentials in Settings.'); }
}
async function accessToken(settings: Data) {
  let response: Response;
  try {
    response = await fetch(BASE + '/v1/oauth2/token', {method: 'POST', headers: {Authorization: 'Basic ' + btoa(settings.clientId + ':' + settings.secret), 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(20000)});
  } catch { return fail(502, 'PayPal could not be reached. Try again.'); }
  if (!response.ok) return fail(502, 'PayPal rejected these sandbox credentials. Check the test Client ID and Secret.');
  let data: Data;
  try { data = await response.json(); } catch { return fail(502, 'PayPal returned an unreadable authentication response.'); }
  if (!data || typeof data.access_token !== 'string' || !data.access_token || data.access_token.length > 10000) return fail(502, 'PayPal did not return an access token.');
  return data.access_token;
}
export async function paymentSettings(env: AISettingsEnv) {
  return {configured: !!(await env.DB.prepare('SELECT key FROM meta WHERE key=?').bind(KEY).first()), mode: 'sandbox', storageAvailable: /^[a-f\d]{64}$/i.test(env.AI_SETTINGS_KEY || '')};
}
export async function savePaymentSettings(env: AISettingsEnv, input: Data) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['clientId', 'secret'].includes(k))) fail(400, 'Only sandbox Client ID and Secret can be changed here.');
  for (const field of ['clientId', 'secret']) if (input[field] !== undefined && typeof input[field] !== 'string') fail(400, 'Sandbox credentials must be text.');
  // Both replacement credentials also allow an administrator to repair damaged encrypted settings.
  const replacing = input.clientId?.trim() && input.secret?.trim();
  const old = replacing ? null : await config(env);
  const next = {clientId: input.clientId?.trim() || old?.clientId, secret: input.secret?.trim() || old?.secret};
  if (!credential(next.clientId) || !credential(next.secret)) fail(400, 'Enter the sandbox Client ID and Secret.');
  const key = await encryptionKey(env);
  await accessToken(next);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: encoder.encode(KEY)}, key, encoder.encode(JSON.stringify(next)));
  await env.DB.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(KEY, JSON.stringify({iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext))})).run();
  return paymentSettings(env);
}
async function paypal(env: AISettingsEnv, path: string, method = 'GET', body?: Data, requestId?: string) {
  const settings = await config(env);
  if (!settings) fail(503, 'PayPal is not connected yet. Ask program staff to add sandbox credentials in Settings.');
  const token = await accessToken(settings!);
  let response: Response;
  try {
    response = await fetch(BASE + path, {method, headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(requestId ? {'PayPal-Request-Id': requestId} : {})}, ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(25000)});
  } catch { return fail(504, 'PayPal did not finish responding. Return to Membership plans and check this payment before trying again.'); }
  let data: Data;
  try { data = await response.json(); } catch { return fail(502, 'PayPal returned an unreadable response. Check the payment again.'); }
  if (!response.ok) return fail(502, data?.name === 'INSTRUMENT_DECLINED' ? 'The sandbox payment was declined. Choose another sandbox payment method.' : 'PayPal could not complete this request. Check this payment again from Membership plans.');
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(502, 'PayPal returned an invalid response. Check the payment again.');
  return data;
}

// Serialize creation, cancellation and fulfillment across Workers isolates. A crashed
// request can be retried after the lease; provider request IDs survive that retry.
async function locked<T>(env: AISettingsEnv, userId: string, action: () => Promise<T>): Promise<T> {
  const lockKey = 'paypal-checkout-lock:' + userId;
  const now = Date.now(), value = JSON.stringify({token: crypto.randomUUID(), expiresAt: now + 300000});
  const acquired = await env.DB.prepare("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(meta.value,'$.expiresAt') AS INTEGER)<? RETURNING value").bind(lockKey, value, now).first();
  if (!acquired) return fail(409, 'This payment is already being checked. Wait a moment, then check its status again.');
  try { return await action(); }
  finally { await env.DB.prepare('DELETE FROM meta WHERE key=? AND value=?').bind(lockKey, value).run(); }
}
function approvalLink(order: Data): string | null {
  const link = Array.isArray(order.links) ? order.links.find((item: Data) => item && ['payer-action', 'approve'].includes(item.rel))?.href : null;
  if (typeof link !== 'string') return null;
  try {
    const url = new URL(link);
    return url.protocol === 'https:' && url.hostname === 'www.sandbox.paypal.com' && !url.port && !url.username && !url.password && url.searchParams.get('token') === order.id ? url.href : null;
  } catch { return null; }
}
export async function createPayment(env: AISettingsEnv, userId: string, plan: Data, origin: string) {
  if (!plan.active || typeof plan.priceAmount !== 'number' || !Number.isFinite(plan.priceAmount) || plan.priceAmount <= 0 || plan.priceAmount > 1000000 || Math.abs(plan.priceAmount * 100 - Math.round(plan.priceAmount * 100)) > 0.000001 || !['monthly', 'yearly', 'one_time'].includes(plan.billingPeriod)) fail(400, 'Choose an active paid plan with a valid price.');
  if (!['USD', 'CAD', 'EUR', 'GBP', 'AUD'].includes(plan.currency)) fail(400, 'Test checkout currently supports USD, CAD, EUR, GBP and AUD. Ask staff to change this plan’s currency.');
  const returnOrigin = new URL(origin).origin;
  if (!await config(env)) fail(503, 'PayPal is not connected yet. Ask staff to add credentials in Settings.');
  return locked(env, userId, async () => {
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT OR IGNORE INTO paypal_orders(id,user_id,plan_id,amount,currency,billing_period,created_at) VALUES(?,?,?,?,?,?,?)').bind(id, userId, plan.id, plan.priceAmount.toFixed(2), plan.currency, plan.billingPeriod, new Date().toISOString()).run();
    let row = await env.DB.prepare("SELECT * FROM paypal_orders WHERE user_id=? AND status='pending'").bind(userId).first<Data>();
    if (!row) return fail(409, 'Checkout changed. Refresh your membership page.');
    if (row.plan_id !== plan.id) return {order: publicOrder(row), message: 'You already have a pending checkout for another plan. Finish or cancel it first.'};
    if (!row.paypal_id) {
      const order = await paypal(env, '/v2/checkout/orders', 'POST', {intent: 'CAPTURE', purchase_units: [{reference_id: row.id, custom_id: row.id, description: `NextStep ${String(plan.name).slice(0, 80)} — sandbox test; one ${row.billing_period === 'monthly' ? 'month' : row.billing_period === 'yearly' ? 'year' : 'membership'}; no automatic renewal`, amount: {currency_code: row.currency, value: row.amount}}], payment_source: {paypal: {experience_context: {brand_name: 'NextStep Sandbox', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING', return_url: returnOrigin + '/?checkout=' + row.id + '#membership', cancel_url: returnOrigin + '/?checkout=' + row.id + '&payment=canceled#membership'}}}}, row.id);
      const approval = approvalLink(order);
      if (!providerId(order.id) || !approval) return fail(502, 'PayPal did not return a valid sandbox checkout link.');
      await env.DB.prepare("UPDATE paypal_orders SET paypal_id=?,approval_url=? WHERE id=? AND status='pending' AND paypal_id IS NULL").bind(order.id, approval, row.id).run();
      row = (await env.DB.prepare('SELECT * FROM paypal_orders WHERE id=?').bind(row.id).first<Data>())!;
    }
    return {order: publicOrder(row)};
  });
}
export function publicOrder(row: Data) {
  return {id: row.id, planId: row.plan_id, amount: row.amount, currency: row.currency, billingPeriod: row.billing_period, status: row.status, approvalUrl: row.status === 'pending' ? row.approval_url : null, createdAt: row.created_at, expiresAt: row.expires_at, mode: 'sandbox'};
}
export async function ownedOrders(env: AISettingsEnv, userId: string) {
  return (await env.DB.prepare('SELECT * FROM paypal_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20').bind(userId).all<Data>()).results.map(publicOrder);
}
function matchingUnit(order: Data, row: Data): Data | null {
  if (!order || order.id !== row.paypal_id || order.intent !== 'CAPTURE' || !Array.isArray(order.purchase_units) || order.purchase_units.length !== 1) return null;
  const unit = order.purchase_units[0];
  return unit && unit.custom_id === row.id && unit.reference_id === row.id && unit.amount?.currency_code === row.currency && minorUnits(row.amount) !== null && minorUnits(row.amount)! > 0 && minorUnits(unit.amount?.value) === minorUnits(row.amount) ? unit : null;
}
export function verifiedCapture(order: Data, row: Data) {
  const unit = matchingUnit(order, row);
  if (!unit || order.status !== 'COMPLETED' || !Array.isArray(unit.payments?.captures) || unit.payments.captures.length !== 1) return null;
  const capture = unit.payments.captures[0];
  return capture && capture.status === 'COMPLETED' && capture.final_capture === true && capture.amount?.currency_code === row.currency && minorUnits(capture.amount?.value) === minorUnits(row.amount) && providerId(capture.id) ? capture : null;
}
export async function finishPayment(env: AISettingsEnv, userId: string, id: string, cancel = false) {
  // Check ownership before acquiring a lease or making any provider request.
  if (!await env.DB.prepare('SELECT id FROM paypal_orders WHERE id=? AND user_id=?').bind(id, userId).first()) return fail(404, 'Payment not found.');
  return locked(env, userId, async () => {
    const row = await env.DB.prepare('SELECT * FROM paypal_orders WHERE id=? AND user_id=?').bind(id, userId).first<Data>();
    if (!row) return fail(404, 'Payment not found.');
    if (row.status !== 'pending') return {order: publicOrder(row)};
    if (!await env.DB.prepare("SELECT id FROM users WHERE id=? AND active=1 AND role='learner'").bind(userId).first()) return fail(409, 'This account cannot receive a membership. Ask program staff to reactivate it before continuing checkout.');
    if (!row.paypal_id) {
      if (!cancel) return fail(409, 'Checkout is still being created. Try again shortly.');
      await env.DB.prepare("UPDATE paypal_orders SET status='canceled' WHERE id=? AND status='pending' AND paypal_id IS NULL").bind(id).run();
      return {order: publicOrder({...row, status: 'canceled'})};
    }
    let order = await paypal(env, '/v2/checkout/orders/' + encodeURIComponent(row.paypal_id));
    if (!matchingUnit(order, row)) return fail(502, 'PayPal payment details did not match this checkout. Your membership has not changed. Ask staff to review this payment.');
    if (cancel && ['CREATED', 'SAVED', 'PAYER_ACTION_REQUIRED', 'VOIDED'].includes(order.status)) {
      await env.DB.prepare("UPDATE paypal_orders SET status='canceled' WHERE id=? AND status='pending'").bind(id).run();
      return {order: publicOrder({...row, status: 'canceled'})};
    }
    if (cancel && order.status === 'APPROVED') return fail(409, 'This payment has been approved. Check its status to finish it before changing plans.');
    if (order.status === 'APPROVED') order = await paypal(env, '/v2/checkout/orders/' + encodeURIComponent(row.paypal_id) + '/capture', 'POST', {}, 'c-' + id);
    const capture = verifiedCapture(order, row);
    if (!capture) return {order: publicOrder(row), message: 'Payment is not completed yet. Check payment again after PayPal confirms it. Your membership has not changed.'};
    const completed = new Date().toISOString();
    const expiry = row.billing_period === 'monthly' || row.billing_period === 'yearly' ? new Date(completed) : null;
    if (expiry) expiry.setUTCDate(expiry.getUTCDate() + (row.billing_period === 'monthly' ? 30 : 365));
    const until = expiry?.toISOString() || null;
    // D1 batches are transactional. The pending predicate makes fulfillment once-only;
    // a capture_id uniqueness failure rolls back the membership update as well.
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET data=json_set(data,'$.membershipTier',?,'$.membershipPurchaseId',?,'$.membershipExpiresAt',?,'$.membershipPaymentMode','sandbox') WHERE id=? AND active=1 AND role='learner' AND EXISTS(SELECT 1 FROM paypal_orders WHERE id=? AND user_id=? AND status='pending')").bind(row.plan_id, id, until, userId, id, userId),
      env.DB.prepare("UPDATE paypal_orders SET status='completed',completed_at=?,capture_id=?,expires_at=? WHERE id=? AND user_id=? AND status='pending' AND changes()>0").bind(completed, capture.id, until, id, userId)
    ]);
    const saved = (await env.DB.prepare('SELECT * FROM paypal_orders WHERE id=? AND user_id=?').bind(id, userId).first<Data>())!;
    return {order: publicOrder(saved), message: saved.status === 'completed' ? 'Payment verified. Your plan is now active.' : 'Payment received. Ask staff to check your account before making another payment.'};
  });
}
