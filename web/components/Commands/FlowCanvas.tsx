'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  type NodeProps,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RolePicker } from '@/components/ui/RolePicker';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import type { DiscordRole, DiscordChannel } from '@/lib/discord';
import { flowActions, type FlowAction, type CommandFlow } from '@/lib/commandFlow';
import {
  Zap,
  MessageSquare,
  Send,
  Package,
  ShieldCheck,
  KeyRound,
  Hash,
  UserPlus,
  UserMinus,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react';

type HawkNode = Node<{ action: FlowAction; args: Record<string, string | number> }, 'hawk'>;

interface ActionTheme {
  label: string;
  badgeBg: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ACTION_THEMES: Record<FlowAction, ActionTheme> = {
  trigger: {
    label: 'Trigger',
    badgeBg: 'var(--flow-trigger)',
    icon: Zap,
  },
  reply: {
    label: 'Reply Message',
    badgeBg: 'var(--flow-reply)',
    icon: MessageSquare,
  },
  send: {
    label: 'Send To Channel',
    badgeBg: 'var(--flow-send)',
    icon: Send,
  },
  embed: {
    label: 'Rich Embed',
    badgeBg: 'var(--flow-embed)',
    icon: Package,
  },
  hasRole: {
    label: 'Check Role',
    badgeBg: 'var(--flow-condition)',
    icon: ShieldCheck,
  },
  hasPermission: {
    label: 'Check Permission',
    badgeBg: 'var(--flow-condition)',
    icon: KeyRound,
  },
  inChannel: {
    label: 'Check Channel',
    badgeBg: 'var(--flow-channel)',
    icon: Hash,
  },
  addRole: {
    label: 'Add Role',
    badgeBg: 'var(--flow-add-role)',
    icon: UserPlus,
  },
  removeRole: {
    label: 'Remove Role',
    badgeBg: 'var(--flow-remove-role)',
    icon: UserMinus,
  },
  wait: {
    label: 'Delay / Wait',
    badgeBg: 'var(--flow-wait)',
    icon: Clock,
  },
  react: {
    label: 'React With Emoji',
    badgeBg: 'var(--flow-react)',
    icon: Sparkles,
  },
};

function ActionNode({ data, selected }: NodeProps<HawkNode>) {
  const theme = ACTION_THEMES[data.action] || {
    label: data.action,
    badgeBg: 'var(--text-secondary)',
    icon: Zap,
  };
  const IconComponent = theme.icon;
  const isCondition = ['hasRole', 'hasPermission', 'inChannel'].includes(data.action);

  // Human-readable summary
  let summary = 'Configure in the side panel';
  if (data.action === 'reply' || data.action === 'send') {
    summary = String(data.args.text || 'Message text');
  } else if (data.action === 'embed') {
    summary = String(data.args.title || data.args.description || 'Rich embed card');
  } else if (data.action === 'hasRole' || data.action === 'addRole' || data.action === 'removeRole') {
    summary = data.args.roleId ? `Role: ${data.args.roleId}` : 'Role not configured';
  } else if (data.action === 'hasPermission') {
    summary = `Perm: ${data.args.permission || 'SendMessages'}`;
  } else if (data.action === 'inChannel') {
    summary = data.args.channelId ? `Channel: ${data.args.channelId}` : 'Channel not configured';
  } else if (data.action === 'wait') {
    summary = `Pause ${data.args.ms || 1000}ms`;
  } else if (data.action === 'react') {
    summary = `React ${data.args.emoji || '👍'}`;
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-150 w-[240px] shadow-xl overflow-hidden select-none ${
        selected
          ? 'border-accent shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-1 ring-accent'
          : 'border-border/80 hover:border-text-secondary/50'
      } bg-surface-panel text-text-primary`}
    >
      {/* Input Handle */}
      {data.action !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-surface-panel !bg-accent !-left-1.5 shadow-md hover:scale-125 transition-transform"
        />
      )}

      {/* Node Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-2">
        <div
          className="p-1 rounded-md shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${theme.badgeBg} 15%, transparent)`, color: theme.badgeBg }}
        >
          <IconComponent size={13} />
        </div>
        <span className="text-[11px] font-semibold tracking-wide uppercase truncate" style={{ color: theme.badgeBg }}>
          {theme.label}
        </span>
      </div>

      {/* Node Content */}
      <div className="p-3">
        <p className="text-xs text-text-secondary font-mono leading-relaxed line-clamp-2 break-words">
          {summary}
        </p>
      </div>

      {/* Conditional Branching Output Ports */}
      {isCondition ? (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface-2 text-[10px] font-semibold tracking-wider uppercase">
          <span className="text-success-text">Yes</span>
          <Handle
            id="yes"
            type="source"
            position={Position.Right}
            style={{ top: '65%' }}
            className="!w-3 !h-3 !border-2 !border-surface-panel !bg-success-text !-right-1.5 shadow-md hover:scale-125 transition-transform"
            aria-label="Yes branch"
          />
          <span className="text-critical-text ml-auto mr-1">No</span>
          <Handle
            id="no"
            type="source"
            position={Position.Right}
            style={{ top: '85%' }}
            className="!w-3 !h-3 !border-2 !border-surface-panel !bg-critical-text !-right-1.5 shadow-md hover:scale-125 transition-transform"
            aria-label="No branch"
          />
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-surface-panel !bg-accent !-right-1.5 shadow-md hover:scale-125 transition-transform"
        />
      )}
    </div>
  );
}

const nodeTypes = { hawk: ActionNode };

export default function FlowCanvas({
  flow,
  onChange,
  disabled,
  roles = [],
  channels = [],
}: {
  flow: CommandFlow;
  onChange: (flow: CommandFlow) => void;
  disabled?: boolean;
  roles?: DiscordRole[];
  channels?: DiscordChannel[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const node = flow.nodes.find(n => n.id === selected);

  const nodes = useMemo(
    () =>
      flow.nodes.map(n => ({
        ...n,
        type: 'hawk' as const,
        selected: n.id === selected,
      })),
    [flow.nodes, selected]
  );

  const edges = useMemo(
    () =>
      flow.edges.map(e => ({
        ...e,
        animated: true,
        style: { stroke: 'var(--accent)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--accent)',
          width: 14,
          height: 14,
        },
      })),
    [flow.edges]
  );

  // CRITICAL BUG FIX: Only notify onChange for user-driven structural/position changes.
  // Ignore dimension measurements and selection changes on initial mount so SaveBar stays hidden!
  const changeNodes = useCallback(
    (changes: NodeChange<HawkNode>[]) => {
      const actionableChanges = changes.filter(
        c => c.type !== 'dimensions' && c.type !== 'select'
      );
      if (actionableChanges.length === 0) return;

      // For drag positions, only propagate when drag is finished or coordinate actually shifted
      const hasMeaningfulMove = actionableChanges.some(c => {
        if (c.type === 'position') {
          return c.dragging === false || c.position !== undefined;
        }
        return true;
      });

      if (!hasMeaningfulMove) return;

      const updatedNodes = applyNodeChanges(actionableChanges, nodes);
      onChange({
        ...flow,
        nodes: updatedNodes.map(n => ({
          id: n.id,
          type: 'hawk',
          position: n.position,
          data: n.data,
        })),
      });
    },
    [flow, nodes, onChange]
  );

  const changeEdges = useCallback(
    (changes: EdgeChange[]) => {
      const actionable = changes.filter(c => c.type !== 'select');
      if (actionable.length === 0) return;
      onChange({ ...flow, edges: applyEdgeChanges(changes, flow.edges) });
    },
    [flow, onChange]
  );

  const connect = useCallback(
    (connection: Connection) => {
      onChange({ ...flow, edges: addEdge(connection, flow.edges) });
    },
    [flow, onChange]
  );

  const add = (action: FlowAction) => {
    if (!action) return;
    const id = `${action}-${crypto.randomUUID().slice(0, 6)}`;
    const newNode: HawkNode = {
      id,
      type: 'hawk',
      position: { x: 260, y: flow.nodes.length * 90 },
      data: {
        action,
        args:
          action === 'reply'
            ? { text: 'Hello {user}' }
            : action === 'wait'
            ? { ms: 1000 }
            : action === 'react'
            ? { emoji: '👍' }
            : {},
      },
    };
    onChange({
      ...flow,
      nodes: [...flow.nodes, newNode],
    });
    setSelected(id);
  };

  const setArgument = (key: string, value: string | number) => {
    if (!node || disabled) return;
    onChange({ ...flow, nodes: flow.nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, args: { ...n.data.args, [key]: value } } } : n) });
  };

  const deleteSelectedNode = () => {
    if (!node || node.data.action === 'trigger' || disabled) return;
    onChange({
      nodes: flow.nodes.filter(n => n.id !== node.id),
      edges: flow.edges.filter(e => e.source !== node.id && e.target !== node.id),
    });
    setSelected(null);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-4">
      {/* Visual Graph Viewport */}
      <div className="h-[540px] border border-border rounded-xl overflow-hidden bg-canvas hawk-flow relative shadow-inner">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={disabled ? undefined : changeNodes}
          onEdgesChange={disabled ? undefined : changeEdges}
          onConnect={disabled ? undefined : connect}
          onNodeClick={(_, n) => setSelected(n.id)}
          onPaneClick={() => setSelected(null)}
          nodesDraggable={!disabled}
          nodesConnectable={!disabled}
          deleteKeyCode={disabled ? null : ['Backspace', 'Delete']}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="var(--border-panel)" gap={20} size={1} />
          <Controls className="!bg-surface-2 !border-border !rounded-lg !overflow-hidden !shadow-xl" />
        </ReactFlow>
      </div>

      {/* Action Toolbox & Inspector */}
      <aside className="space-y-4 surface-container p-4 rounded-xl border border-border flex flex-col">
        {/* Add Action Dropdown */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Add Action Node
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Add flow action"
              disabled={disabled}
              value=""
              onChange={e => add(e.target.value as FlowAction)}
              className="glass-input text-xs py-2 w-full"
            >
              <option value="">Select node to append…</option>
              {flowActions
                .filter(a => a !== 'trigger')
                .map(a => (
                  <option key={a} value={a}>
                    + {ACTION_THEMES[a]?.label || a}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Selected Node Properties */}
        {node ? (
          <div className="space-y-3.5 pt-3 border-t border-border flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                {ACTION_THEMES[node.data.action]?.label || node.data.action}
              </span>
              {node.data.action !== 'trigger' && (
                <button
                  type="button"
                  onClick={deleteSelectedNode}
                  disabled={disabled}
                  className="p-1 rounded text-text-muted hover:text-critical-text hover:bg-critical-soft transition-colors"
                  title="Delete selected node"
                  aria-label="Delete selected node"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Field Editors */}
            <div className="space-y-2.5">
              {(node.data.action === 'trigger'
                ? []
                : node.data.action === 'embed'
                ? ['channelId', 'title', 'description']
                : ['hasRole', 'addRole', 'removeRole'].includes(node.data.action)
                ? ['roleId']
                : node.data.action === 'hasPermission'
                ? ['permission']
                : node.data.action === 'inChannel'
                ? ['channelId']
                : node.data.action === 'send'
                ? ['channelId', 'text']
                : node.data.action === 'wait'
                ? ['ms']
                : node.data.action === 'react'
                ? ['emoji']
                : ['text']
              ).map(key => (
                <div className="block text-xs text-text-secondary" key={key}>
                  <span className="font-mono text-[11px] capitalize">{key}</span>
                  {key === 'roleId' ? (
                    <RolePicker roles={roles} label={`${node.data.action} role`} disabled={disabled} value={String(node.data.args[key] || '') || null} onChange={value => setArgument(key, value || '')}/>
                  ) : key === 'channelId' ? (
                    <ChannelPicker channels={channels} label={`${node.data.action} channel`} disabled={disabled} value={String(node.data.args[key] || '') || null} onChange={value => setArgument(key, value || '')} allowedTypes={node.data.action === 'inChannel' ? [0, 2, 5, 10, 11, 12, 13, 15, 16] : [0, 5, 10, 11, 12]}/>
                  ) : key === 'text' || key === 'description' ? (
                    <textarea
                      aria-label={`${node.data.action} ${key}`}
                      rows={3}
                      className="glass-input mt-1 text-xs w-full leading-relaxed"
                      disabled={disabled}
                      value={node.data.args[key] ?? ''}
                      onChange={e =>
                        onChange({
                          ...flow,
                          nodes: flow.nodes.map(n =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    args: {
                                      ...n.data.args,
                                      [key]: e.target.value,
                                    },
                                  },
                                }
                              : n
                          ),
                        })
                      }
                    />
                  ) : (
                    <input
                      aria-label={`${node.data.action} ${key}`}
                      className="glass-input mt-1 text-xs w-full font-mono"
                      disabled={disabled}
                      value={node.data.args[key] ?? ''}
                      onChange={e =>
                        onChange({
                          ...flow,
                          nodes: flow.nodes.map(n =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  data: {
                                    ...n.data,
                                    args: {
                                      ...n.data.args,
                                      [key]:
                                        key === 'ms'
                                          ? Number(e.target.value)
                                          : e.target.value,
                                    },
                                  },
                                }
                              : n
                          ),
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            {node.data.action !== 'trigger' && (
              <button
                type="button"
                className="btn-outline-danger w-full text-xs py-1.5 mt-2"
                disabled={disabled}
                onClick={deleteSelectedNode}
              >
                Delete this node
              </button>
            )}
          </div>
        ) : (
          <div className="pt-4 border-t border-border text-center text-xs text-text-muted space-y-1">
            <p>Click any node on the canvas to configure parameters or branch routes.</p>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-border/50 text-[11px] text-text-muted leading-relaxed">
          Drag handles to connect. Conditions branch into <span className="text-success-text font-medium">Yes</span> and <span className="text-critical-text font-medium">No</span> paths.
        </div>
      </aside>
    </div>
  );
}
