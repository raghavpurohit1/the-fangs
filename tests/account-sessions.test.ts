import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import worker, {type Env} from '../src/index.ts';

async function fixture() {
  const runtime = new Miniflare(convertV4MiniflareOptions({modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-11-21', d1Databases: ['DB']}));
  const DB = await runtime.getD1Database('DB');
  let statement = '', trigger = false;
  for (const line of (await readFile(new URL('../migrations/schema.sql', import.meta.url), 'utf8')).split('\n')) {
    statement += line + '\n';
    if (/^CREATE TRIGGER/.test(line)) trigger = true;
    if (/^END;/.test(line)) trigger = false;
    if (line.trim().endsWith(';') && !trigger) {await DB.prepare(statement.trim()).run(); statement = '';}
  }
  const env = {DB, DEMO_MODE: 'true', SEED_DEMO_DATA: 'false', ASSETS: {fetch: async () => new Response('website')}} as unknown as Env;
  function client(initialCookie = '') {
    let cookie = initialCookie;
    return {get cookie() {return cookie;}, async call(path: string, method = 'GET', body?: unknown) {
      const response = await worker.fetch(new Request('https://nextstep.test' + path, {method, headers: {Origin: 'https://nextstep.test', Cookie: cookie, 'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})}), env);
      const saved = response.headers.get('Set-Cookie'); if (saved) cookie = saved.split(';')[0];
      return {status: response.status, body: await response.json() as any};
    }};
  }
  return {runtime, DB, client};
}

const learnerCredentials = {username: 'session-learner', password: 'Synthetic learner password'};
async function register(client: ReturnType<Awaited<ReturnType<typeof fixture>>['client']>) {
  const registration = await client.call('/api/register', 'POST', {...learnerCredentials, name: 'Session learner', stage: 'Exploring tech', goal: 'Learn Python'});
  assert.equal(registration.status, 200);
  return registration.body.user;
}

test('separate cookie jars stay isolated when switching accounts, logging out and changing passwords', async () => {
  const f = await fixture();
  try {
    const learner = f.client(), admin = f.client(), secondLearnerSession = f.client();
    const person = await register(learner);
    assert.equal((await admin.call('/api/login', 'POST', {username: 'admin', password: 'test1234'})).status, 200);
    assert.equal((await secondLearnerSession.call('/api/login', 'POST', learnerCredentials)).status, 200);
    assert.notEqual(learner.cookie, secondLearnerSession.cookie);
    assert.equal((await admin.call('/api/state')).body.user.role, 'admin');
    assert.equal((await learner.call('/api/state')).body.user.id, person.id);
    const originalCookie = learner.cookie;
    assert.equal((await learner.call('/api/account/password', 'POST', {currentPassword: learnerCredentials.password, newPassword: 'Replacement learner password'})).status, 200);
    assert.equal((await secondLearnerSession.call('/api/state')).body.user, null);
    assert.equal((await learner.call('/api/state')).body.user.id, person.id);
    assert.equal((await admin.call('/api/state')).body.user.role, 'admin');
    // Switching accounts rotates the session instead of retaining the old token.
    assert.equal((await learner.call('/api/login', 'POST', {username: 'admin', password: 'test1234'})).status, 200);
    assert.equal((await f.client(originalCookie).call('/api/state')).body.user, null);
    assert.equal((await learner.call('/api/state')).body.user.role, 'admin');
    const signedOutCookie = learner.cookie;
    assert.equal((await learner.call('/api/logout', 'POST', {})).status, 200);
    assert.equal((await f.client(signedOutCookie).call('/api/state')).body.user, null);
    assert.equal((await admin.call('/api/state')).body.user.role, 'admin', 'Logging out one browser does not log out another');
  } finally {await f.runtime.dispose();}
});

test('reactivating learners or mentors never revives sessions issued before deactivation', async () => {
  const f = await fixture();
  try {
    const admin = f.client(), learner = f.client(), mentor = f.client();
    await admin.call('/api/login', 'POST', {username: 'admin', password: 'test1234'});
    const person = await register(learner);
    const oldLearnerCookie = learner.cookie;
    assert.equal((await admin.call('/api/admin/learner/' + person.id, 'PUT', {active: false})).status, 200);
    assert.equal((await learner.call('/api/state')).body.user, null);
    assert.equal((await admin.call('/api/admin/learner/' + person.id, 'PUT', {active: true})).status, 200);
    assert.equal((await f.client(oldLearnerCookie).call('/api/state')).body.user, null, 'Learner must sign in again after reactivation');
    assert.equal((await learner.call('/api/login', 'POST', learnerCredentials)).status, 200);

    const onboarding = await admin.call('/api/admin/mentor-onboarding', 'POST', {name: 'Session mentor', expertise: ['Python'], capacity: 1});
    assert.equal(onboarding.status, 201);
    assert.equal((await mentor.call('/api/login', 'POST', onboarding.body.credentials)).status, 200);
    const oldMentorCookie = mentor.cookie;
    const profile = onboarding.body.mentor;
    assert.equal((await admin.call('/api/admin/mentor', 'POST', {...profile, active: false})).status, 200);
    assert.equal((await mentor.call('/api/state')).body.user, null);
    assert.equal((await admin.call('/api/admin/mentor', 'POST', {...profile, active: true})).status, 200);
    assert.equal((await f.client(oldMentorCookie).call('/api/state')).body.user, null, 'Mentor must sign in again after reactivation');
    assert.equal((await mentor.call('/api/login', 'POST', onboarding.body.credentials)).status, 200);
  } finally {await f.runtime.dispose();}
});
