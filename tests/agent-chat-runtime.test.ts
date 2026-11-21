import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

async function chat(options: {history?: any[]; reply: any; refresh?: () => Promise<any>}) {
  const rendered: string[] = [], requests: any[] = [];
  let nodes: any[] = [];
  const log: any = {set innerHTML(value: string) { nodes = [...value.matchAll(/data-message="(\d+)"/g)].map(match => ({dataset: {message: match[1]}, classList: {add() {}}, textContent: ''})); }, querySelectorAll: () => nodes, scrollHeight: 0};
  const input: any = {value: '', addEventListener() {}, focus() {}};
  const form: any = {elements: {message: input}, querySelector: () => ({})};
  const host = {innerHTML: '', querySelector: (selector: string) => selector === '[role=log]' ? log : form};
  const runtime = vm.createContext({window: {NextStepMarkdown: {render: (_: any, value: string) => rendered.push(value)}}});
  vm.runInContext(readFileSync(new URL('../public/program-agent.js', import.meta.url), 'utf8'), runtime);
  await runtime.window.NextStepAgent.mount(host, {
    state: {aiAvailable: true}, refresh: options.refresh || (async () => ({aiAvailable: true})),
    request: async (path: string, method: string, payload: any) => {
      requests.push({path, method, payload});
      return path.endsWith('/history') ? {proposals: options.history || []} : options.reply;
    }
  });
  return {input, rendered, requests, submit: async (text: string) => {input.value = text; await form.onsubmit({preventDefault() {}, stopPropagation() {}});}};
}

test('reopened admin chat retains recent discussion without resending credential payloads or private action data', async () => {
  const history = [{request: 'Describe the Guided plan', reply: 'Guided costs 20 each month.', status: 'answered', actions: [], credentials: [{password: 'ONE_TIME_SECRET'}]}, {request: 'Review an earlier operation', reply: 'Reviewed.', status: 'answered', actions: [{before: {email: 'private@example.test'}, changes: {story: 'PRIVATE_ACTION_DATA'}}]}];
  const session = await chat({history, reply: {proposal: {reply: 'What price should I use?', status: 'answered', actions: []}}});
  await session.submit('Make that yearly instead');
  const context = session.requests[1].payload.context;
  assert.match(context, /Describe the Guided plan/);
  assert.match(context, /Guided costs 20 each month/);
  assert.doesNotMatch(context, /ONE_TIME_SECRET|private@example|PRIVATE_ACTION_DATA/);
});

test('a successful apply stays successful when the subsequent page refresh fails', async () => {
  const action = {title: 'Update Guided', operation: 'plan', changes: {priceAmount: 20}};
  const session = await chat({history: [{id: 'proposal-test', request: 'Update Guided price to 20', reply: 'Ready to update Guided.', status: 'pending', expiresAt: new Date(Date.now() + 600000).toISOString(), actions: [action]}], reply: {proposal: {status: 'applied', actions: [action], results: [{status: 'succeeded', title: 'Update Guided'}]}}, refresh: async () => {throw new Error('Network unavailable');}});
  await session.submit('apply');
  assert.equal(session.requests[1].path, '/api/admin/agent/proposal-test/apply');
  assert.ok(session.rendered.includes('Done — your changes are saved.'));
  assert.ok(session.rendered.some(text => text.includes('page could not refresh')));
  assert.ok(session.rendered.every(text => !text.includes('Your request has not been automatically repeated')));
  assert.equal(session.input.value, '', 'Do not restore an already applied command for resubmission');
  assert.equal(session.requests.length, 2, 'The successful write is never retried');
});
