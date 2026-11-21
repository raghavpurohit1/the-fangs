import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('floating agent redraws changed records without removing the ongoing chat', async () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const code = app.slice(app.indexOf('async function refreshFromAssistant()'), app.indexOf('function mountLearningReview()'));
  let agentContext: any, renders = 0, removed = false;
  const content = {};
  const drawer = {className: '', innerHTML: '', setAttribute() {}, addEventListener() {}, showModal() {}, close() {}, remove() { removed = true; }, querySelector: (selector: string) => selector === 'button' ? {} : content};
  const updated = {user: {role: 'admin'}, courses: [{id: 'course', published: false}]};
  const runtime = vm.createContext({
    data: {user: {role: 'admin'}}, view: 'courses', app: {querySelectorAll: () => []},
    document: {createElement: () => drawer, body: {append() {}}},
    api() {}, notify() {}, refreshState: async () => updated,
    render() { renders++; },
    window: {NextStepAgent: {mount: async (_: any, context: any) => { agentContext = context; }}}
  });
  vm.runInContext(code + '\nopenAssistantDrawer();', runtime);
  assert.ok(agentContext, 'The floating chat mounts its agent');
  assert.equal(await agentContext.refresh(), updated);
  assert.equal(renders, 1, 'Saved course and plan changes become visible immediately');
  assert.equal(removed, false, 'Updating the page preserves the open chat');
});


test('assistant refresh retains unsaved form nodes and passwords while updating the page', async () => {
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('async function refreshFromAssistant()'), source.indexOf('function openAssistantDrawer()'));
  const draft = {dataset: {form: 'ai-settings'}, elements: [{type: 'password', tagName: 'INPUT', value: 'unsaved-secret', defaultValue: ''}]};
  let preserved: any, refreshed = false;
  const replacement = {dataset: draft.dataset, replaceWith(node: any) { preserved = node; }};
  const runtime = vm.createContext({app: {querySelectorAll: () => refreshed ? [replacement] : [draft]}, refreshState: async () => ({}), render() { refreshed = true; }});
  vm.runInContext(code, runtime);
  await vm.runInContext('refreshFromAssistant()', runtime);
  assert.equal(refreshed, true);
  assert.equal(preserved, draft);
  assert.equal(preserved.elements[0].value, 'unsaved-secret');
});
