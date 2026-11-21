import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import worker, {type Env} from '../src/index.ts';
import {matchConnections} from '../src/matching.ts';
import {type AISettingsEnv} from '../src/ai-settings.ts';

const person = (id: string, expertise: string[], extra = {}) => ({id, name: id, role: 'Mentor', company: 'Community', active: true, capacity: 2, expertise, experiences: [], stage: 'Exploring tech', availability: 'Tuesday evenings', ...extra});
const learner = {id: 'learner-a', goal: 'Practice Python for data analysis', interests: 'Python', stage: 'Exploring tech', availability: 'Evenings'};
const settingsEnv = {DB: {prepare() {return {bind() {return {async first() {return null;}};}};}}, OPENAI_API_KEY: 'synthetic-ai-key-for-matching-tests'} as unknown as AISettingsEnv;
const exampleCourses = [{id: 'python-course', title: 'Python course', skills: ['Python'], level: 'Beginner'}];

test('matching returns real relevant people, excludes archived/full profiles and never substitutes courses', async () => {
  const result = await matchConnections(settingsEnv, learner, [person('python-person', ['Python', 'Data analysis']), person('cook-person', ['Cooking']), person('archived', ['Python'], {active: false}), person('full', ['Python'], {capacity: 0}), person('python-person', ['Python'])], exampleCourses, null, false);
  assert.deepEqual(result.mentors.map(m => m.id), ['python-person']);
  assert.deepEqual(result.mentors[0].sharedInterests, ['python', 'data', 'analysis']);
  assert.deepEqual(result.courses, []); assert.deepEqual(result.otherMentors, []);
  assert.equal(result.eligibleMentorCount, 2); assert.equal(result.requestNeeded, false);
  assert.equal(result.scope, 'program-mentors');
});

test('unrelated cooking mentor is visible honestly, with staff-request fallback and no AI call', async () => {
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => {calls++; throw new Error('Unexpected AI call');};
  try {
    const result = await matchConnections(settingsEnv, learner, [person('cook-person', ['Cooking'])], exampleCourses);
    assert.deepEqual(result.mentors, []); assert.equal(result.otherMentors[0].id, 'cook-person');
    assert.deepEqual(result.otherMentors[0].sharedInterests, []);
    assert.equal(result.otherMentors[0].matchStatus, 'not-matched');
    assert.match(result.summary, /No shared-interest mentor match/); assert.equal(result.requestNeeded, true);
    assert.deepEqual(result.courses, []); assert.equal(calls, 0);
    const empty = await matchConnections(settingsEnv, learner, [], exampleCourses);
    assert.deepEqual(empty.mentors, []); assert.deepEqual(empty.otherMentors, []);
    assert.match(empty.summary, /No mentors in this program/); assert.equal(empty.requestNeeded, true);
  } finally {globalThis.fetch = previous;}
});

test('AI matching sends only professional preferences and rejects invented people or false topic overlap', async () => {
  const previous = globalThis.fetch; let input: any, invented = false;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); input = body;
    return new Response(JSON.stringify({status: 'completed', output: [{content: [{type: 'output_text', text: JSON.stringify({mentors: [{id: invented ? 'cook-person' : 'python-person', reason: 'Their Python expertise fits your goal.', sharedInterests: ['Invented topic'], questions: ['Confirm a time together.']}]})}]}]}));
  };
  try {
    const privateLearner = {...learner, name: 'PRIVATE_NAME', email: 'PRIVATE_EMAIL', grades: 'PRIVATE_GRADES', resume: 'PRIVATE_RESUME', story: 'PRIVATE_STORY'};
    const mentors = [person('python-person', ['Python'], {name: 'PRIVATE_MENTOR_NAME', email: 'PRIVATE_CONTACT', story: 'PRIVATE_MENTOR_STORY'}), person('cook-person', ['Cooking'])];
    const result = await matchConnections(settingsEnv, privateLearner, mentors, exampleCourses);
    assert.equal(result.mode, 'ai'); assert.deepEqual(result.mentors[0].sharedInterests, ['python']);
    assert.equal(input.store, false); assert.equal(input.text.format.strict, true);
    assert.doesNotMatch(input.input, /PRIVATE_|Python course|python-course|cook-person/);
    assert.equal(JSON.parse(input.input).learner.interests, 'Python');
    invented = true;
    const rejected = await matchConnections(settingsEnv, privateLearner, mentors, exampleCourses);
    assert.equal(rejected.mode, 'profile-match'); assert.deepEqual(rejected.mentors.map(m => m.id), ['python-person']);
    assert.match(rejected.notice!, /AI matching is unavailable/);
  } finally {globalThis.fetch = previous;}
});

test('web connection results show people, preserve honest no-match labels and submit durable request actions', async () => {
  const source = await readFile(new URL('../public/matching.js', import.meta.url), 'utf8');
  const requests: any[] = [], notices: string[] = [], navigated: string[] = [];
  const data: any = {user: {...learner, role: 'learner'}, mentors: [person('cook-person', ['Cooking'])], requests: []};
  const error = {textContent: ''}, topic = {value: 'Please find a mentor who can help me practice Python.'};
  const composer = {querySelector(selector: string) {return selector === '[name=matchTopic]' ? topic : error;}};
  const panel = {querySelector() {return composer;}};
  const button: any = {dataset: {}, disabled: false, closest() {return panel;}};
  let reject = false;
  const context = vm.createContext({data, esc: (value: unknown) => String(value ?? ''), api: async (path: string, method: string, payload: any) => {requests.push({path, method, payload}); if (reject) throw new Error('Server rejected the request'); return {request: {id: 'request-saved', userId: learner.id, mentorId: null, topic: payload.topic, status: 'waiting'}};}, navigate: async (page: string) => {navigated.push(page);}, notify: (message: string) => {notices.push(message);}, button, result: {mode: 'profile-match', summary: 'No shared-interest mentor match is confirmed.', mentors: [], otherMentors: [{id: 'cook-person', reason: 'Different expertise.', questions: [], sharedInterests: []}], courses: exampleCourses}});
  vm.runInContext(source, context);
  const html = vm.runInContext("matchingResults(result)", context);
  assert.match(html, /cook-person/); assert.match(html, /No confirmed shared-interest match/);
  assert.match(html, /Ask staff to find a mentor/); assert.doesNotMatch(html, /Python course|Courses for your interests/);
  await vm.runInContext("matchingAction('send-match-request',button)", context);
  assert.equal(requests[0].path, '/api/requests'); assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].payload.mentorId, undefined); assert.equal(requests[0].payload.topic, topic.value);
  assert.equal(data.requests[0].id, 'request-saved'); assert.equal(navigated[0], 'mentors'); assert.match(notices[0], /Request saved/);
  reject = true; await vm.runInContext("matchingAction('send-match-request',button)", context);
  assert.equal(notices.length, 1); assert.equal(error.textContent, 'Server rejected the request');
  reject = false; data.user = {id: 'admin', role: 'admin'}; button.dataset = {id: 'cook-person', learnerId: learner.id};
  await vm.runInContext("matchingAction('send-match-request',button)", context);
  assert.equal(requests[2].path, '/api/admin/connection-request'); assert.equal(requests[2].payload.userId, learner.id); assert.equal(requests[2].payload.mentorId, 'cook-person');
});

async function databaseFixture() {
  const runtime = new Miniflare(convertV4MiniflareOptions({modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-11-21', d1Databases: ['DB']}));
  const DB = await runtime.getD1Database('DB');
  const schema = await readFile(new URL('../migrations/schema.sql', import.meta.url), 'utf8');
  let statement = '', trigger = false;
  for (const line of schema.split('\n')) {statement += line + '\n'; if (/^CREATE TRIGGER/.test(line)) trigger = true; if (/^END;/.test(line)) trigger = false; if (line.trim().endsWith(';') && !trigger) {await DB.prepare(statement.trim()).run(); statement = '';}}
  const env = {DB, ASSETS: {fetch: async () => new Response('website')}, DEMO_MODE: 'true', SEED_DEMO_DATA: 'false'} as unknown as Env;
  function client() {
    let cookie = '';
    return {async call(path: string, method = 'GET', input?: any) {
      const response = await worker.fetch(new Request('https://nextstep.test' + path, {method, headers: {Origin: 'https://nextstep.test', Cookie: cookie, 'Content-Type': 'application/json'}, ...(input === undefined ? {} : {body: JSON.stringify(input)})}), env);
      const saved = response.headers.get('Set-Cookie'); if (saved) cookie = saved.split(';')[0];
      return {status: response.status, body: await response.json() as any};
    }};
  }
  return {runtime, DB, client};
}

test('connection API saves learner/staff requests, enforces ownership and excludes mentors at scheduled capacity', async () => {
  const f = await databaseFixture();
  try {
    const learnerClient = f.client(), admin = f.client(), other = f.client();
    const registered = await learnerClient.call('/api/register', 'POST', {name: 'Connection learner', username: 'connection-learner', password: 'test-password-123', stage: 'Exploring tech', goal: learner.goal});
    assert.equal(registered.status, 200);
    await learnerClient.call('/api/profile', 'PUT', {interests: 'Python'});
    const learnerId = (await learnerClient.call('/api/state')).body.user.id;
    for (const mentor of [person('python-person', ['Python'], {capacity: 1}), person('cook-person', ['Cooking']), person('archived', ['Python'], {active: false})]) await f.DB.prepare("INSERT INTO content(kind,id,data) VALUES('mentor',?,?)").bind(mentor.id, JSON.stringify(mentor)).run();
    const found = await learnerClient.call('/api/matches', 'POST', {});
    assert.equal(found.status, 200); assert.deepEqual(found.body.mentors.map((m: any) => m.id), ['python-person']); assert.deepEqual(found.body.courses, []);
    const open = await learnerClient.call('/api/requests', 'POST', {topic: 'Please find a Python mentor', cadence: 'one_time'});
    assert.equal(open.status, 201); assert.equal(open.body.request.mentorId, null);
    const state = (await learnerClient.call('/api/state')).body;
    assert.ok(state.requests.some((request: any) => request.id === open.body.request.id && request.status === 'waiting'));
    assert.equal((await learnerClient.call('/api/requests', 'POST', {topic: 'Duplicate open request'})).status, 409);
    assert.equal((await learnerClient.call('/api/admin/connection-request', 'POST', {userId: learnerId, topic: 'Unauthorized'})).status, 403);
    assert.equal((await admin.call('/api/login', 'POST', {username: 'admin', password: 'test1234'})).status, 200);
    const introduction = await admin.call('/api/admin/connection-request', 'POST', {userId: learnerId, mentorId: 'python-person', topic: 'Introduce this learner for Python support', cadence: 'monthly'});
    assert.equal(introduction.status, 201); assert.equal(introduction.body.request.userId, learnerId);
    assert.equal((await admin.call('/api/admin/connection-request', 'POST', {userId: learnerId, mentorId: 'python-person', topic: 'Duplicate introduction'})).status, 409);
    await f.DB.prepare("UPDATE mentor_requests SET status='scheduled' WHERE id=?").bind(introduction.body.request.id).run();
    const full = await learnerClient.call('/api/matches', 'POST', {});
    assert.deepEqual(full.body.mentors, []); assert.deepEqual(full.body.otherMentors.map((m: any) => m.id), ['cook-person']);
    const registeredOther = await other.call('/api/register', 'POST', {name: 'Other learner', username: 'other-connection', password: 'test-password-123', stage: 'Exploring tech', goal: 'Learn design'});
    assert.equal(registeredOther.status, 200);
    assert.equal((await other.call('/api/matches', 'POST', {learnerId})).status, 403);
    assert.deepEqual((await other.call('/api/state')).body.requests, []);
    const row = await f.DB.prepare('SELECT * FROM mentor_requests WHERE id=?').bind(open.body.request.id).first<any>();
    assert.equal(row.user_id, learnerId); assert.equal(row.status, 'waiting'); assert.equal(row.topic, 'Please find a Python mentor');
  } finally {await f.runtime.dispose();}
});
