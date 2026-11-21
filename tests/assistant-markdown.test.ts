import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// A minimal DOM with no HTML parser: assigning innerHTML fails the test.
class Element {
  children: Element[] = [];
  attributes: Record<string, string> = {};
  ownText = '';
  className = '';
  ownerDocument: any;
  classList = {add: (...names: string[]) => { this.className = [this.className, ...names].filter(Boolean).join(' '); }};
  constructor(public tagName: string, doc?: any) { this.ownerDocument = doc; }
  append(...nodes: Element[]) { for (const node of nodes) this.children.push(...(node.tagName === '#fragment' ? node.children : [node])); }
  replaceChildren(...nodes: Element[]) { this.children = []; this.ownText = ''; this.append(...nodes); }
  setAttribute(key: string, value: string) { this.attributes[key] = String(value); }
  set textContent(value: string) { this.ownText = String(value); this.children = []; }
  get textContent(): string { return this.ownText + this.children.map(child => child.textContent).join(''); }
  set innerHTML(_: string) { throw new Error('Markdown must never invoke an HTML parser'); }
}
const doc = {
  createElement: (tag: string) => new Element(tag, doc),
  createTextNode: (text: string) => { const node = new Element('#text', doc); node.textContent = text; return node; },
  createDocumentFragment: () => new Element('#fragment', doc)
};
const context = vm.createContext({window: {}, document: doc, URL});
vm.runInContext(readFileSync(new URL('../public/assistant-markdown.js', import.meta.url), 'utf8'), context);
function render(source: string) {
  const host = new Element('div', doc);
  context.window.NextStepMarkdown.render(host, source);
  return host;
}
function all(node: Element, tag?: string): Element[] {
  return [node, ...node.children.flatMap(child => all(child))].filter(item => !tag || item.tagName === tag);
}

test('assistant Markdown renders accessible tables, alignment, inline formatting and escaped pipes', () => {
  const host = render('# Compare plans\n\n| Plan | Price | Benefits |\n| :--- | ---: | :---: |\n| **Community** | $0 | `A|B` and help \\| support |\n| Guided | $20 | Mentor requests |');
  assert.equal(all(host, 'h2')[0].textContent, 'Compare plans');
  assert.equal(all(host, 'table').length, 1);
  assert.equal(all(host, 'tr').length, 3);
  assert.equal(all(host, 'th').length, 3);
  assert.ok(all(host, 'th').every(cell => cell.attributes.scope === 'col'));
  assert.equal(all(host, 'th')[1].className, 'assistant-align-right');
  assert.equal(all(host, 'th')[2].className, 'assistant-align-center');
  assert.equal(all(host, 'strong')[0].textContent, 'Community');
  assert.equal(all(host, 'td')[2].textContent, 'A|B and help | support');
  assert.equal(all(host, 'code')[0].textContent, 'A|B');
  const region = all(host).find(node => node.attributes.role === 'region');
  assert.equal(region?.attributes.tabindex, '0');
  assert.ok(region?.attributes['aria-label']);
});

test('headings, bullets, numbered steps, nested lists and code use semantic nodes', () => {
  const host = render('## Next steps\n\n- Read **the overview**\n  - Ask a mentor\n- Practice\n\n3. Review `results`\n4. Repeat\n\n```html\n<script>alert("not executed")</script>\n```\n\nA line\nAnother line');
  assert.equal(all(host, 'h3')[0].textContent, 'Next steps');
  assert.equal(all(host, 'ul').length, 2);
  assert.equal(all(host, 'ol')[0].attributes.start, '3');
  assert.equal(all(host, 'li').length, 5);
  assert.equal(all(host, 'pre')[0].textContent, '<script>alert("not executed")</script>');
  assert.equal(all(host, 'script').length, 0);
  assert.equal(all(host, 'br').length, 1);
  assert.equal(all(host, 'strong')[0].textContent, 'the overview');
});

test('raw HTML and unsafe URLs remain inert text while safe links get protected attributes', () => {
  const attacks = '<img src=x onerror=alert(1)> <script>alert(2)</script>\n\n[bad](javascript:alert(1)) [data](data:text/html,x) [vb](vbscript:msgbox(1)) [entity](javascript&#58;alert(1)) [protocol](//evil.example) [slash](/\\evil.example) [control](java\u000bscript:alert(1))';
  const host = render(attacks + '\n\n[Docs](https://example.org/a_(b)?q=1&x=2) [Help](mailto:help@example.org) [Courses](/#courses)');
  assert.equal(all(host, 'img').length, 0);
  assert.equal(all(host, 'script').length, 0);
  assert.ok(host.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.ok(host.textContent.includes('[bad](javascript:alert(1))'));
  assert.equal(all(host, 'a').length, 3);
  assert.equal(all(host, 'a')[0].attributes.href, 'https://example.org/a_(b)?q=1&x=2');
  assert.equal(all(host, 'a')[0].attributes.rel, 'noopener noreferrer');
  assert.equal(all(host, 'a')[0].attributes.target, '_blank');
  assert.equal(all(host, 'a')[1].attributes.href, 'mailto:help@example.org');
  assert.equal(all(host, 'a')[2].attributes.href, '/#courses');
  assert.ok(all(host).every(node => Object.keys(node.attributes).every(key => !key.startsWith('on'))));
});

test('invalid table syntax stays readable text and repeat renders replace old content', () => {
  const host = render('Name | Price\nNot a separator | still text');
  assert.equal(all(host, 'table').length, 0);
  assert.ok(host.textContent.includes('Not a separator'));
  context.window.NextStepMarkdown.render(host, '**New reply**');
  assert.equal(host.textContent, 'New reply');
  assert.equal(all(host, 'strong').length, 1);
  context.window.NextStepMarkdown.render(host, '# Learn C#\n\n## Next steps ##');
  assert.equal(all(host, 'h2')[0].textContent, 'Learn C#');
  assert.equal(all(host, 'h3')[0].textContent, 'Next steps');
});

test('agent formats replies but keeps one-time passwords literal and out of subsequent model context', async () => {
  const markdownCalls: string[] = [], requests: any[] = [];
  let messageNodes: any[] = [];
  const log: any = {
    set innerHTML(value: string) { messageNodes = [...value.matchAll(/data-message="(\d+)"/g)].map(match => ({dataset: {message: match[1]}, classList: {add() {}}, textContent: ''})); },
    querySelectorAll: () => messageNodes, scrollHeight: 0
  };
  const input: any = {value: '', addEventListener() {}, focus() {}};
  const send: any = {};
  const form: any = {elements: {message: input}, querySelector: () => send};
  const host: any = {innerHTML: '', querySelector: (selector: string) => selector === '[role=log]' ? log : form};
  const runtime = vm.createContext({window: {NextStepMarkdown: {render: (_host: any, text: string) => markdownCalls.push(text)}}});
  vm.runInContext(readFileSync(new URL('../public/program-agent.js', import.meta.url), 'utf8'), runtime);
  const password = '**literal-password**[keep](https://example.org)';
  await runtime.window.NextStepAgent.mount(host, {
    state: {aiAvailable: true}, refresh: async () => ({aiAvailable: true}),
    request: async (path: string, _method: string, payload: any) => {
      requests.push({path, payload});
      if (path.endsWith('/history')) return {proposals: []};
      return {proposal: {reply: '**Ready** to help', status: 'pending', actions: []}, credentials: requests.length === 2 ? [{name: 'Mentor', username: 'mentor', password}] : []};
    }
  });
  input.value = 'Create the mentor account';
  await form.onsubmit({preventDefault() {}, stopPropagation() {}});
  assert.ok(messageNodes.some(node => node.textContent.includes(password)));
  assert.ok(markdownCalls.includes('**Ready** to help'));
  assert.ok(markdownCalls.every(text => !text.includes(password)));
  input.value = 'What next?';
  await form.onsubmit({preventDefault() {}, stopPropagation() {}});
  assert.ok(!JSON.stringify(requests).includes(password));
});
