'use client';
import React, { useCallback, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, applyNodeChanges, applyEdgeChanges, addEdge, type NodeProps, type Node, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowActions, type FlowAction, type CommandFlow } from '@/lib/commandFlow';
type HawkNode = Node<{ action: FlowAction; args: Record<string, string | number> }, 'hawk'>;
function ActionNode({ data, selected }: NodeProps<HawkNode>) {
  const condition = ['hasRole', 'hasPermission', 'inChannel'].includes(data.action);
  return <div className={`rounded-lg border ${selected ? 'border-accent' : 'border-border'} bg-surface-1 px-4 py-3 w-52 shadow-lg`}>
    {data.action !== 'trigger' && <Handle type="target" position={Position.Left} />}
    <strong className="text-sm">{data.action}</strong><p className="text-xs text-text-muted truncate mt-1">{String(data.args.text || data.args.description || data.args.roleId || data.args.channelId || 'Configure in the side panel')}</p>
    {condition ? <><Handle id="yes" type="source" position={Position.Right} style={{ top: '30%' }} aria-label="Yes branch"/><span className="text-xs text-success-text">Yes</span><Handle id="no" type="source" position={Position.Right} style={{ top: '70%' }} aria-label="No branch"/><span className="ml-4 text-xs text-critical-text">No</span></> : <Handle type="source" position={Position.Right} />}
  </div>;
}
const nodeTypes = { hawk: ActionNode };
export default function FlowCanvas({ flow, onChange, disabled }: { flow: CommandFlow; onChange: (flow: CommandFlow) => void; disabled?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const node = flow.nodes.find(n => n.id === selected);
  const nodes = useMemo(() => flow.nodes.map(n => ({ ...n, type: 'hawk' as const, selected: n.id === selected })), [flow.nodes, selected]);
  const changeNodes = useCallback((changes: NodeChange<HawkNode>[]) => onChange({ ...flow, nodes: applyNodeChanges(changes, nodes) }), [flow, nodes, onChange]);
  const changeEdges = useCallback((changes: EdgeChange[]) => onChange({ ...flow, edges: applyEdgeChanges(changes, flow.edges) }), [flow, onChange]);
  const connect = useCallback((connection: Connection) => onChange({ ...flow, edges: addEdge(connection, flow.edges) }), [flow, onChange]);
  const add = (action: FlowAction) => { const id = `${action}-${crypto.randomUUID().slice(0, 8)}`; onChange({ ...flow, nodes: [...flow.nodes, { id, type: 'hawk', position: { x: 250, y: flow.nodes.length * 100 }, data: { action, args: action === 'reply' ? { text: 'Hello {user}' } : action === 'wait' ? { ms: 1000 } : {} } }] }); setSelected(id); };
  return <div className="grid lg:grid-cols-[1fr_240px] gap-4">
    <div className="h-[520px] border border-border rounded-xl overflow-hidden bg-surface-0"><ReactFlow nodes={nodes} edges={flow.edges} nodeTypes={nodeTypes} onNodesChange={disabled ? undefined : changeNodes} onEdgesChange={disabled ? undefined : changeEdges} onConnect={disabled ? undefined : connect} onNodeClick={(_, n) => setSelected(n.id)} nodesDraggable={!disabled} nodesConnectable={!disabled} deleteKeyCode={disabled ? null : ['Backspace', 'Delete']} fitView><Background/><Controls/></ReactFlow></div>
    <aside className="space-y-4"><label className="block text-sm">Add an action<select aria-label="Add flow action" disabled={disabled} value="" onChange={e => add(e.target.value as FlowAction)} className="glass-input mt-2"><option value="">Choose action…</option>{flowActions.filter(a => a !== 'trigger').map(a => <option key={a}>{a}</option>)}</select></label>
      {node && <div className="space-y-3"><h3 className="font-semibold">{node.data.action}</h3>{(node.data.action === 'trigger' ? [] : node.data.action === 'embed' ? ['channelId', 'title', 'description'] : ['hasRole', 'addRole', 'removeRole'].includes(node.data.action) ? ['roleId'] : node.data.action === 'hasPermission' ? ['permission'] : node.data.action === 'inChannel' ? ['channelId'] : node.data.action === 'send' ? ['channelId', 'text'] : node.data.action === 'wait' ? ['ms'] : node.data.action === 'react' ? ['emoji'] : ['text']).map(key => <label className="block text-xs" key={key}>{key}<input aria-label={`${node.data.action} ${key}`} className="glass-input mt-1" disabled={disabled} value={node.data.args[key] ?? ''} onChange={e => onChange({ ...flow, nodes: flow.nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, args: { ...n.data.args, [key]: key === 'ms' ? Number(e.target.value) : e.target.value } } } : n) })}/></label>)}<button className="btn-outline-danger" disabled={disabled || node.data.action === 'trigger'} onClick={() => { onChange({ nodes: flow.nodes.filter(n => n.id !== node.id), edges: flow.edges.filter(e => e.source !== node.id && e.target !== node.id) }); setSelected(null); }}>Delete node</button></div>}
      <p className="text-xs text-text-muted leading-relaxed">Connect each node from the trigger. Conditions have Yes and No outputs. Select a node to edit its arguments. The script editor supports keyboard editing of every connection.</p>
    </aside>
  </div>;
}
