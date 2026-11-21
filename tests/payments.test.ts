import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {AISettingsError, type AISettingsEnv} from '../src/ai-settings.ts';
import {createPayment, finishPayment, ownedOrders, paymentSettings, savePaymentSettings, verifiedCapture} from '../src/payments.ts';

const TEST_CLIENT = 'synthetic_sandbox_client_for_tests';
const TEST_SECRET = 'synthetic_sandbox_secret_for_tests';
const plan = {id: 'guided', name: 'Guided', active: true, priceAmount: 9.99, currency: 'USD', billingPeriod: 'monthly'};
const origin = 'https://nextstep.test';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
const rejectStatus = (promise: Promise<unknown>, status: number) => assert.rejects(promise, (error: unknown) => error instanceof AISettingsError && error.status === status);
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => resolve = r); return {promise, resolve}; }
async function fixture() {
  const runtime = new Miniflare(convertV4MiniflareOptions({modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-11-21', d1Databases: ['DB']}));
  const DB = await runtime.getD1Database('DB');
  await DB.prepare('CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)').run();
  await DB.prepare('CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,data TEXT NOT NULL)').run();
  for (const statement of (await readFile(new URL('../migrations/0006_paypal_sandbox.sql', import.meta.url), 'utf8')).split(';').filter(s => s.trim())) await DB.prepare(statement).run();
  const env = {DB, AI_SETTINGS_KEY: 'ac'.repeat(32)} as AISettingsEnv;
  const calls: {path: string; method: string; requestId?: string; body?: any}[] = [];
  const orders = new Map<string, any>();
  let tokenFailure = false, lostCapture = false, hook: ((path: string, method: string) => Promise<void>) | undefined;
  const previous = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const parsed = new URL(String(url)), path = parsed.pathname, method = init?.method || 'GET';
    assert.equal(parsed.origin, 'https://api-m.sandbox.paypal.com');
    const headers = new Headers(init?.headers);
    if (path === '/v1/oauth2/token') {
      assert.equal(headers.get('Authorization'), 'Basic ' + btoa(TEST_CLIENT + ':' + TEST_SECRET));
      return tokenFailure ? json({error: TEST_SECRET}, 401) : json({access_token: 'synthetic-token'});
    }
    assert.equal(headers.get('Authorization'), 'Bearer synthetic-token');
    assert.equal(headers.get('Prefer'), 'return=representation');
    if (headers.has('PayPal-Request-Id')) assert.ok(headers.get('PayPal-Request-Id')!.length <= 38);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({path, method, requestId: headers.get('PayPal-Request-Id') || undefined, body});
    if (hook) await hook(path, method);
    if (path === '/v2/checkout/orders' && method === 'POST') {
      const existing = [...orders.values()].find(order => order.requestId === headers.get('PayPal-Request-Id'));
      if (existing) return json(existing);
      const id = 'ORDER' + String(orders.size + 1).padStart(12, '0');
      const order = {id, intent: body.intent, status: 'CREATED', requestId: headers.get('PayPal-Request-Id'), purchase_units: structuredClone(body.purchase_units), links: [{rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=' + id}]};
      orders.set(id, order);
      return json(order, 201);
    }
    const id = path.split('/')[4], order = orders.get(id);
    assert.ok(order, path);
    if (path.endsWith('/capture') && method === 'POST') {
      order.status = 'COMPLETED';
      order.purchase_units[0].payments = {captures: [{id: 'CAPTURE' + id, status: 'COMPLETED', final_capture: true, amount: structuredClone(order.purchase_units[0].amount)}]};
      if (lostCapture) { lostCapture = false; throw new Error('Simulated lost response after capture'); }
    }
    return json(order);
  }) as typeof fetch;
  async function user(id: string) { await DB.prepare('INSERT INTO users(id,role,data) VALUES(?,?,?)').bind(id, 'learner', JSON.stringify({name: id, membershipTier: 'community'})).run(); }
  async function profile(id: string) { return JSON.parse((await DB.prepare('SELECT data FROM users WHERE id=?').bind(id).first<any>())!.data); }
  async function orderRow(id: string) { return (await DB.prepare('SELECT * FROM paypal_orders WHERE id=?').bind(id).first<any>())!; }
  async function checkout(userId = 'learner-a', chosen = plan) {
    const result = await createPayment(env, userId, chosen, origin);
    const row = await orderRow(result.order.id);
    return {row, provider: orders.get(row.paypal_id), public: result.order};
  }
  await user('learner-a'); await user('learner-b');
  return {env, DB, calls, orders, user, profile, orderRow, checkout,
    setHook(value: typeof hook) {hook = value;}, failTokens(value = true) {tokenFailure = value;}, loseCapture() {lostCapture = true;},
    async configure() {return savePaymentSettings(env, {clientId: TEST_CLIENT, secret: TEST_SECRET});},
    async dispose() {globalThis.fetch = previous; await runtime.dispose();}
  };
}

test('sandbox settings validate input, encrypt secrets and expose metadata only', async () => {
  const f = await fixture();
  try {
    assert.deepEqual(await paymentSettings(f.env), {configured: false, mode: 'sandbox', storageAvailable: true});
    await rejectStatus(savePaymentSettings(f.env, {clientId: 42, secret: TEST_SECRET}), 400);
    await rejectStatus(savePaymentSettings(f.env, {clientId: TEST_CLIENT, secret: TEST_SECRET, mode: 'live'}), 400);
    const result = await f.configure();
    assert.deepEqual(result, {configured: true, mode: 'sandbox', storageAvailable: true});
    const row = await f.DB.prepare("SELECT value FROM meta WHERE key='paypal-sandbox-settings-v1'").first<any>();
    for (const value of [JSON.stringify(result), row.value]) { assert.ok(!value.includes(TEST_SECRET)); assert.ok(!value.includes(TEST_CLIENT)); }
    f.failTokens();
    await assert.rejects(f.configure(), error => error instanceof AISettingsError && error.status === 502 && !error.message.includes(TEST_SECRET));
    assert.equal((await f.DB.prepare("SELECT value FROM meta WHERE key='paypal-sandbox-settings-v1'").first<any>()).value, row.value);
    f.failTokens(false);
    await f.DB.prepare("UPDATE meta SET value='broken' WHERE key='paypal-sandbox-settings-v1'").run();
    assert.equal((await f.configure()).configured, true, 'replacing both credentials repairs corrupt storage');
  } finally {await f.dispose();}
});

test('checkout snapshots the server price, validates sandbox approval and reuses pending order', async () => {
  const f = await fixture();
  try {
    await f.configure();
    const created = await f.checkout();
    const repeated = await createPayment(f.env, 'learner-a', {...plan, priceAmount: 20}, origin);
    assert.equal(repeated.order.id, created.row.id);
    assert.equal(repeated.order.amount, '9.99');
    assert.equal(repeated.order.billingPeriod, 'monthly');
    assert.equal(f.calls.filter(call => call.method === 'POST').length, 1);
    assert.equal(f.calls[0].requestId, created.row.id);
    assert.equal(f.calls[0].body.purchase_units[0].amount.value, '9.99');
    assert.match(created.public.approvalUrl, /^https:\/\/www\.sandbox\.paypal\.com\//);
    assert.ok(!JSON.stringify(created.public).includes('user_id'));
    const otherPlan = await createPayment(f.env, 'learner-a', {...plan, id: 'supporter'}, origin);
    assert.equal(otherPlan.order.id, created.row.id);
    assert.match(otherPlan.message!, /another plan/);
    for (const bad of [{priceAmount: NaN}, {priceAmount: -1}, {priceAmount: 1.001}, {currency: 'INR'}, {active: false}, {billingPeriod: 'free'}]) await rejectStatus(createPayment(f.env, 'learner-b', {...plan, ...bad}, origin), 400);
  } finally {await f.dispose();}
});

test('verified capture rejects pending, failed, tampered, partial and malformed payments', () => {
  const row = {id: 'local-order', paypal_id: 'ORDER123', amount: '9.99', currency: 'USD'};
  const order = {id: row.paypal_id, intent: 'CAPTURE', status: 'COMPLETED', purchase_units: [{custom_id: row.id, reference_id: row.id, amount: {value: '9.99', currency_code: 'USD'}, payments: {captures: [{id: 'CAPTURE123', status: 'COMPLETED', final_capture: true, amount: {value: '9.99', currency_code: 'USD'}}]}}]};
  assert.equal(verifiedCapture(order, row)?.id, 'CAPTURE123');
  const variants: ((value: any) => void)[] = [
    value => value.id = 'OTHER123', value => value.intent = 'AUTHORIZE', value => value.status = 'APPROVED',
    value => value.purchase_units.push(structuredClone(value.purchase_units[0])), value => value.purchase_units[0].custom_id = 'other', value => value.purchase_units[0].reference_id = 'other',
    value => value.purchase_units[0].amount.value = '19.99', value => value.purchase_units[0].amount.currency_code = 'CAD',
    ...['PENDING', 'DECLINED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map(status => (value: any) => value.purchase_units[0].payments.captures[0].status = status),
    value => value.purchase_units[0].payments.captures[0].final_capture = false, value => value.purchase_units[0].payments.captures.push(structuredClone(value.purchase_units[0].payments.captures[0])),
    value => value.purchase_units[0].payments.captures[0].amount.value = '9.990', value => value.purchase_units[0].payments.captures[0].amount.value = '0x9',
    value => value.purchase_units[0].payments.captures[0].amount.currency_code = 'CAD', value => value.purchase_units[0].payments.captures[0].id = '', value => value.purchase_units[0].payments.captures[0] = null
  ];
  for (const alter of variants) {const changed = structuredClone(order); alter(changed); assert.equal(verifiedCapture(changed, row), null);}
});

test('ownership is checked before provider access and a completed capture upgrades once', async () => {
  const f = await fixture();
  try {
    await f.configure();
    const {row, provider} = await f.checkout();
    const before = f.calls.length;
    await rejectStatus(finishPayment(f.env, 'learner-b', row.id), 404);
    await rejectStatus(finishPayment(f.env, 'learner-b', row.id, true), 404);
    assert.equal(f.calls.length, before);
    assert.deepEqual(await ownedOrders(f.env, 'learner-b'), []);
    provider.status = 'APPROVED';
    const result = await finishPayment(f.env, 'learner-a', row.id);
    assert.equal(result.order.status, 'completed'); assert.equal(result.order.approvalUrl, null);
    assert.equal((await f.profile('learner-a')).membershipTier, 'guided');
    assert.equal((await f.profile('learner-b')).membershipTier, 'community');
    assert.equal((await f.profile('learner-a')).membershipPaymentMode, 'sandbox');
    const saved = await f.orderRow(row.id), calls = f.calls.length;
    assert.equal(f.calls.find(call => call.path.endsWith('/capture'))!.requestId, 'c-' + row.id);
    const again = await finishPayment(f.env, 'learner-a', row.id);
    assert.equal(again.order.status, 'completed'); assert.equal(f.calls.length, calls);
    assert.deepEqual(await f.orderRow(row.id), saved);
    assert.equal(Date.parse(saved.expires_at) - Date.parse(saved.completed_at), 30 * 86400000);
  } finally {await f.dispose();}
});

test('a lost provider capture response can be checked safely without charging again', async () => {
  const f = await fixture();
  try {
    await f.configure();
    const {row, provider} = await f.checkout(); provider.status = 'APPROVED'; f.loseCapture();
    await rejectStatus(finishPayment(f.env, 'learner-a', row.id), 504);
    assert.equal((await f.profile('learner-a')).membershipTier, 'community');
    assert.equal((await f.orderRow(row.id)).status, 'pending');
    assert.equal((await finishPayment(f.env, 'learner-a', row.id)).order.status, 'completed');
    assert.equal(f.calls.filter(call => call.path.endsWith('/capture')).length, 1);
  } finally {await f.dispose();}
});

test('capture and cancel are serialized across concurrent requests', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  try {
    await f.configure();
    const {row, provider} = await f.checkout(); provider.status = 'APPROVED';
    f.setHook(async path => {if (path.endsWith('/capture')) {entered.resolve(); await release.promise;}});
    const active = finishPayment(f.env, 'learner-a', row.id);
    await entered.promise;
    await rejectStatus(finishPayment(f.env, 'learner-a', row.id), 409);
    await rejectStatus(finishPayment(f.env, 'learner-a', row.id, true), 409);
    await rejectStatus(createPayment(f.env, 'learner-a', {...plan, id: 'supporter'}, origin), 409);
    release.resolve();
    assert.equal((await active).order.status, 'completed');
    assert.equal(f.calls.filter(call => call.path.endsWith('/capture')).length, 1);
    assert.equal((await f.profile('learner-a')).membershipTier, 'guided');
    assert.equal((await f.DB.prepare("SELECT count(*) n FROM meta WHERE key LIKE 'paypal-checkout-lock:%'").first<any>()).n, 0);
  } finally {release.resolve(); await f.dispose();}
});

test('pending and mismatched provider state cannot upgrade or capture the wrong order', async () => {
  const f = await fixture();
  try {
    await f.configure();
    const {row, provider} = await f.checkout();
    assert.equal((await finishPayment(f.env, 'learner-a', row.id)).order.status, 'pending');
    provider.status = 'APPROVED'; provider.purchase_units[0].amount.value = '100.00';
    await rejectStatus(finishPayment(f.env, 'learner-a', row.id), 502);
    assert.equal(f.calls.filter(call => call.path.endsWith('/capture')).length, 0);
    assert.equal((await f.profile('learner-a')).membershipTier, 'community');
    provider.purchase_units[0].amount.value = '9.99'; provider.status = 'COMPLETED';
    provider.purchase_units[0].payments = {captures: [{id: 'CAPTURE123', status: 'PENDING', final_capture: true, amount: {value: '9.99', currency_code: 'USD'}}]};
    assert.equal((await finishPayment(f.env, 'learner-a', row.id)).order.status, 'pending');
    assert.equal((await f.profile('learner-a')).membershipTier, 'community');
  } finally {await f.dispose();}
});

test('cancel clears an unapproved order and expired leases recover without retaining a stale approval URL', async () => {
  const f = await fixture();
  try {
    await f.configure();
    const {row} = await f.checkout();
    await f.DB.prepare('INSERT INTO meta(key,value) VALUES(?,?)').bind('paypal-checkout-lock:learner-a', JSON.stringify({token: 'old', expiresAt: Date.now() - 1})).run();
    const canceled = await finishPayment(f.env, 'learner-a', row.id, true);
    assert.equal(canceled.order.status, 'canceled'); assert.equal(canceled.order.approvalUrl, null);
    assert.equal((await f.profile('learner-a')).membershipTier, 'community');
    const next = await f.checkout(); assert.notEqual(next.row.id, row.id);
    next.provider.status = 'APPROVED';
    await rejectStatus(finishPayment(f.env, 'learner-a', next.row.id, true), 409);
    assert.equal((await f.orderRow(next.row.id)).status, 'pending');
  } finally {await f.dispose();}
});

test('a reused capture ID rolls back membership changes atomically and inactive accounts cannot be charged', async () => {
  const f = await fixture();
  try {
    await f.configure();
    const first = await f.checkout(); first.provider.status = 'APPROVED';
    await finishPayment(f.env, 'learner-a', first.row.id);
    const saved = await f.orderRow(first.row.id);
    const second = await f.checkout('learner-b'); second.provider.status = 'COMPLETED';
    second.provider.purchase_units[0].payments = {captures: [{id: saved.capture_id, status: 'COMPLETED', final_capture: true, amount: {value: '9.99', currency_code: 'USD'}}]};
    await assert.rejects(finishPayment(f.env, 'learner-b', second.row.id), /UNIQUE constraint failed/);
    assert.equal((await f.profile('learner-b')).membershipTier, 'community');
    assert.equal((await f.orderRow(second.row.id)).status, 'pending');
    assert.equal((await f.orderRow(first.row.id)).status, 'completed');
    await f.DB.prepare("UPDATE users SET active=0 WHERE id='learner-b'").run();
    second.provider.status = 'APPROVED';
    const calls = f.calls.length;
    await rejectStatus(finishPayment(f.env, 'learner-b', second.row.id), 409);
    assert.equal(f.calls.length, calls);
  } finally {await f.dispose();}
});
