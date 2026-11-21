import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import worker, {type Env} from '../src/index.ts';

// Exercise the same route boundaries used by the website against an isolated D1
// database. All people, credentials and records here are synthetic.
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
  function client() {
    let cookie = '';
    return {async call(path: string, method = 'GET', body?: any) {
      const response = await worker.fetch(new Request('https://nextstep.test' + path, {method, headers: {Origin: 'https://nextstep.test', Cookie: cookie, 'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})}), env);
      const saved = response.headers.get('Set-Cookie'); if (saved) cookie = saved.split(';')[0];
      return {status: response.status, body: await response.json() as any};
    }};
  }
  return {runtime, DB, env, client};
}

test('website journey persists application, staff support, mentor meeting and announcement replies across accounts', async () => {
  const f = await fixture();
  try {
    const admin = f.client(), learner = f.client(), other = f.client(), mentor = f.client();
    assert.equal((await admin.call('/api/login', 'POST', {username: 'admin', password: 'test1234'})).status, 200);
    for (const [client, username] of [[learner, 'workflow-learner'], [other, 'workflow-other']] as const) {
      assert.equal((await client.call('/api/register', 'POST', {username, name: username, password: 'Synthetic-workflow-password', stage: 'Exploring tech', goal: 'Learn Python'})).status, 200);
    }
    const learnerId = (await learner.call('/api/state')).body.user.id;
    const application = await learner.call('/api/applications', 'POST', {goals: 'Explore Python', interests: ['Python'], availability: 'Tuesday evenings', supportNeeds: 'A private application note'});
    assert.equal(application.status, 201);
    const reviewed = await admin.call('/api/admin/application/' + application.body.application.id, 'PUT', {status: 'follow_up', revision: application.body.application.revision, staffNote: 'Please confirm your preferred time.'});
    assert.equal(reviewed.status, 200);
    const revised = await learner.call('/api/applications/' + application.body.application.id, 'PUT', {revision: reviewed.body.application.revision, availability: 'Tuesday at 5 PM'});
    assert.equal(revised.status, 200); assert.equal(revised.body.application.status, 'submitted');
    const need = await learner.call('/api/needs', 'POST', {category: 'mentoring', priority: 'soon', summary: 'Please help me schedule my first meeting.'});
    assert.equal(need.status, 201);
    const response = await admin.call('/api/admin/need/' + need.body.need.id, 'PUT', {status: 'in_progress', adminNote: 'A mentor has been assigned. Check Find a mentor for the meeting link.'});
    assert.equal(response.status, 200);
    const onboarding = await admin.call('/api/admin/mentor-onboarding', 'POST', {name: 'Workflow mentor', expertise: ['Python'], availability: 'Tuesday evenings', capacity: 1});
    assert.equal(onboarding.status, 201);
    assert.equal((await mentor.call('/api/login', 'POST', onboarding.body.credentials)).status, 200);
    const requested = await learner.call('/api/requests', 'POST', {mentorId: onboarding.body.mentor.id, topic: 'Python loops', cadence: 'weekly'});
    assert.equal(requested.status, 201);
    const requestId = requested.body.request.id;
    const scheduled = await mentor.call('/api/mentor/requests/' + requestId, 'PUT', {status: 'scheduled', sessionAt: new Date(Date.now() + 86400000).toISOString(), meetingUrl: 'https://meet.example.org/workflow', notes: 'Bring one Python question.'});
    assert.equal(scheduled.status, 200);
    const learnerState = (await learner.call('/api/state')).body;
    assert.equal(learnerState.requests.find((r: any) => r.id === requestId).meetingUrl, 'https://meet.example.org/workflow');
    assert.equal(learnerState.needs.find((n: any) => n.id === need.body.need.id).adminNote, response.body.need.adminNote);
    const mentorState = (await mentor.call('/api/state')).body;
    assert.equal(mentorState.mentees[0].id, learnerId); assert.equal(mentorState.requests[0].notes, 'Bring one Python question.');
    assert.doesNotMatch(JSON.stringify(mentorState), /private application note|preferred time/);
    const otherState = (await other.call('/api/state')).body;
    assert.deepEqual(otherState.requests, []); assert.deepEqual(otherState.needs, []); assert.deepEqual(otherState.applications, []);
    const past = new Date(Date.now() - 86400000).toISOString();
    assert.equal((await mentor.call('/api/mentor/requests/' + requestId, 'PUT', {status: 'completed', sessionAt: past, lastMetAt: past})).status, 200);
    assert.equal((await admin.call('/api/metrics')).body.completedSessions, 1);
    const announcement = (await admin.call('/api/admin/announcement', 'POST', {title: 'Next session', body: 'Review your saved meeting link.', cohort: 'Independent learners', active: true})).body.announcement;
    assert.equal((await learner.call('/api/announcements/' + announcement.id + '/read', 'POST', {revision: announcement.revision})).status, 200);
    assert.equal((await admin.call('/api/state')).body.announcementStats.find((a: any) => a.id === announcement.id).readCount, 1);
    assert.equal((await mentor.call('/api/announcements/' + announcement.id + '/read', 'POST', {revision: announcement.revision})).status, 403);
  } finally {await f.runtime.dispose();}
});

test('assistant and payment routes use the current plan and expire paid access before answering', async () => {
  const f = await fixture();
  try {
    const admin = f.client(), learner = f.client(), anonymous = f.client();
    await admin.call('/api/login', 'POST', {username: 'admin', password: 'test1234'});
    await learner.call('/api/register', 'POST', {name: 'Plan learner', username: 'plan-workflow', password: 'Synthetic-workflow-password', stage: 'Exploring tech', goal: 'Learn Python'});
    const state = (await admin.call('/api/state')).body;
    const community = state.settings.membershipTiers.find((p: any) => p.isDefault);
    const limited = await admin.call('/api/admin/membership-plan/' + community.id, 'PUT', {revision: community.revision, access: {courses: 'none', courseIds: [], mentoring: false, aiHelp: false}});
    assert.equal(limited.status, 200);
    assert.equal((await learner.call('/api/assistant', 'POST', {message: 'Help me learn Python'})).status, 403);
    assert.equal((await anonymous.call('/api/assistant', 'POST', {message: 'Hello'})).status, 401);
    assert.equal((await learner.call('/api/admin/agent/history')).status, 403);
    const learnerId = (await learner.call('/api/state')).body.user.id;
    await admin.call('/api/admin/learner/' + learnerId, 'PUT', {membershipTier: 'guided'});
    const plan = await learner.call('/api/assistant', 'POST', {message: 'Help me learn Python'});
    assert.equal(plan.status, 200); assert.equal(plan.body.mode, 'program-guide'); assert.ok(plan.body.steps.length);
    // A purchased plan expires on the next API request, not only on a page reload.
    await f.DB.prepare("UPDATE users SET data=json_set(data,'$.membershipExpiresAt',?,'$.membershipPurchaseId','synthetic-expired-purchase','$.membershipPaymentMode','sandbox') WHERE id=?").bind(new Date(Date.now() - 1000).toISOString(), learnerId).run();
    assert.equal((await learner.call('/api/assistant', 'POST', {message: 'Now expired'})).status, 403);
    const expired = (await learner.call('/api/state')).body;
    assert.equal(expired.user.membershipTier, community.id); assert.equal(expired.user.membershipExpiresAt, undefined); assert.equal(expired.user.membershipPurchaseId, undefined);
    assert.deepEqual(expired.paymentOrders, []); assert.equal(expired.payments.configured, false);
    const paidPlan = state.settings.membershipTiers.find((p: any) => p.id === 'guided');
    assert.equal((await learner.call('/api/payments/order', 'POST', {planId: paidPlan.id, revision: paidPlan.revision + 1})).status, 409);
    assert.equal((await admin.call('/api/payments/order', 'POST', {planId: paidPlan.id, revision: paidPlan.revision})).status, 403);
  } finally {await f.runtime.dispose();}
});
