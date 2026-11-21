import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import worker, {type Env} from '../src/index.ts';

test('stale browser requests cannot write or log out the account selected in another tab', async () => {
  const runtime = new Miniflare(convertV4MiniflareOptions({modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-11-21', d1Databases: ['DB']}));
  try {
    const DB = await runtime.getD1Database('DB');
    let statement = '', trigger = false;
    for (const line of (await readFile(new URL('../migrations/schema.sql', import.meta.url), 'utf8')).split('\n')) {
      statement += line + '\n';
      if (/^CREATE TRIGGER/.test(line)) trigger = true;
      if (/^END;/.test(line)) trigger = false;
      if (line.trim().endsWith(';') && !trigger) {await DB.prepare(statement.trim()).run(); statement = '';}
    }
    const env = {DB, DEMO_MODE: 'true', SEED_DEMO_DATA: 'false', ASSETS: {fetch: async () => new Response('website')}} as unknown as Env;
    let cookie = '';
    const call = async (path: string, method = 'GET', input?: unknown, expectedUser?: string) => {
      const response = await worker.fetch(new Request('https://nextstep.test' + path, {method, headers: {Origin: 'https://nextstep.test', Cookie: cookie, 'Content-Type': 'application/json', ...(expectedUser ? {'X-NextStep-User': expectedUser} : {})}, ...(input === undefined ? {} : {body: JSON.stringify(input)})}), env);
      const saved = response.headers.get('Set-Cookie'); if (saved) cookie = saved.split(';')[0];
      return {status: response.status, body: await response.json() as any};
    };
    const credentials = {username: 'identity-first', password: 'Synthetic identity test password'};
    const first = await call('/api/register', 'POST', {...credentials, name: 'First learner', stage: 'Exploring tech', goal: 'First goal'});
    assert.equal(first.status, 200);
    const firstId = first.body.user.id;
    // Simulate another ordinary tab registering an account with the shared cookie.
    const second = await call('/api/register', 'POST', {...credentials, username: 'identity-second', name: 'Second learner', stage: 'Exploring tech', goal: 'Second goal'}, firstId);
    assert.equal(second.status, 200);
    const secondId = second.body.user.id;
    const staleWrite = await call('/api/profile', 'PUT', {goal: 'Unintended overwrite'}, firstId);
    assert.equal(staleWrite.status, 409); assert.equal(staleWrite.body.code, 'ACCOUNT_CHANGED');
    assert.match(staleWrite.body.error, /another tab/);
    const staleNeed = await call('/api/needs', 'POST', {category: 'mentoring', summary: 'Wrong account request', priority: 'soon'}, firstId);
    assert.equal(staleNeed.status, 409);
    const staleLogout = await call('/api/logout', 'POST', undefined, firstId);
    assert.equal(staleLogout.status, 409);
    const current = await call('/api/state');
    assert.equal(current.body.user.id, secondId); assert.equal(current.body.user.goal, 'Second goal'); assert.deepEqual(current.body.needs, []);
    assert.equal((await call('/api/profile', 'PUT', {goal: 'Intentional update'}, secondId)).status, 200);
    assert.equal((await call('/api/state')).body.user.goal, 'Intentional update');
    // Reauthentication is allowed even when the caller has an older identity.
    assert.equal((await call('/api/login', 'POST', credentials, secondId)).status, 200);
    assert.equal((await call('/api/state')).body.user.id, firstId);
    assert.equal((await call('/api/logout', 'POST', undefined, firstId)).status, 200);
    // An expired session still produces 401 so the existing draft recovery works.
    assert.equal((await call('/api/profile', 'PUT', {goal: 'Expired session draft'}, firstId)).status, 401);
  } finally {await runtime.dispose();}
});

test('browser sends displayed identity on writes and preserves account-switch errors without retrying', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const source = app.slice(app.indexOf('async function api('), app.indexOf('async function refreshState'));
  const calls: any[] = []; let recoveries = 0, status = 200;
  const context = vm.createContext({learnerPreview: null, data: {user: {id: 'displayed-learner', role: 'learner'}}, window: {NextStepSession: {recover: async () => {recoveries++;}}}, fetch: async (path: string, options: any) => {calls.push({path, ...options}); return new Response(JSON.stringify(status === 409 ? {error: 'Account changed in another tab.', code: 'ACCOUNT_CHANGED'} : {ok: true}), {status});}, Response});
  vm.runInContext(source, context);
  await vm.runInContext("api('/api/profile','PUT',{goal:'Saved draft'})", context);
  await vm.runInContext("api('/api/logout','POST')", context);
  await vm.runInContext("api('/api/state')", context);
  await vm.runInContext("api('/api/login','POST',{username:'other'})", context);
  await vm.runInContext("api('/api/register','POST',{username:'new'})", context);
  assert.equal(calls[0].headers['X-NextStep-User'], 'displayed-learner');
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.equal(calls[1].headers['X-NextStep-User'], 'displayed-learner');
  for (const call of calls.slice(2)) assert.equal(call.headers['X-NextStep-User'], undefined);
  status = 409;
  await assert.rejects(vm.runInContext("api('/api/profile','PUT',{goal:'Draft preserved'})", context), (error: any) => error.status === 409 && error.code === 'ACCOUNT_CHANGED');
  assert.equal(calls.length, 6); assert.equal(recoveries, 0);
});
