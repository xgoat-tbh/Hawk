import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flowToTypeScript,
  flowToJavaScript,
  flowToPython,
  parseScriptToFlow,
} from '../web/lib/commandScripting';
import type { CommandFlow } from '../web/lib/commandFlow';

const sampleFlow: CommandFlow = {
  nodes: [
    { id: 'trigger', type: 'hawk', position: { x: 0, y: 0 }, data: { action: 'trigger', args: {} } },
    { id: 'reply', type: 'hawk', position: { x: 270, y: 0 }, data: { action: 'reply', args: { text: 'Hello {user}' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'reply' },
  ],
};

test('flowToTypeScript and back to flow', () => {
  const ts = flowToTypeScript(sampleFlow, 'greet');
  assert.match(ts, /ctx\.reply\("Hello \{user\}"\)/);
  const flow = parseScriptToFlow(ts, 'typescript');
  assert.equal(flow.nodes.length, 2);
  assert.equal(flow.nodes[1].data.action, 'reply');
  assert.equal(flow.nodes[1].data.args.text, 'Hello {user}');
});

test('flowToPython and back to flow', () => {
  const py = flowToPython(sampleFlow, 'greet');
  assert.match(py, /await ctx\.reply\("Hello \{user\}"\)/);
  const flow = parseScriptToFlow(py, 'python');
  assert.equal(flow.nodes.length, 2);
  assert.equal(flow.nodes[1].data.action, 'reply');
});

test('flowToJavaScript and back to flow', () => {
  const js = flowToJavaScript(sampleFlow, 'greet');
  assert.match(js, /await ctx\.reply\("Hello \{user\}"\)/);
  const flow = parseScriptToFlow(js, 'javascript');
  assert.equal(flow.nodes.length, 2);
  assert.equal(flow.nodes[1].data.action, 'reply');
});
