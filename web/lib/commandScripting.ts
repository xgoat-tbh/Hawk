import { validateFlow, flowToScript, scriptToFlow, type CommandFlow, type FlowNode, type FlowEdge, type FlowAction } from './commandFlow';

export type SupportedScriptLanguage = 'typescript' | 'javascript' | 'python' | 'flow';

/**
 * Generate clean TypeScript code from a CommandFlow
 */
export function flowToTypeScript(flow: CommandFlow, commandName = 'command'): string {
  const trigger = flow.nodes.find(n => n.data.action === 'trigger');
  if (!trigger) return '// Flow missing trigger node';

  const lines: string[] = [
    `// Hawk Custom Command: !${commandName}`,
    `import { CommandContext } from '@hawk/bot';`,
    ``,
    `export default async function execute(ctx: CommandContext) {`,
  ];

  generateBodyCode(flow, trigger.id, lines, '  ', 'ts');

  lines.push(`}`);
  return lines.join('\n');
}

/**
 * Generate clean JavaScript code from a CommandFlow
 */
export function flowToJavaScript(flow: CommandFlow, commandName = 'command'): string {
  const trigger = flow.nodes.find(n => n.data.action === 'trigger');
  if (!trigger) return '// Flow missing trigger node';

  const lines: string[] = [
    `// Hawk Custom Command: !${commandName}`,
    ``,
    `export default async function execute(ctx) {`,
  ];

  generateBodyCode(flow, trigger.id, lines, '  ', 'js');

  lines.push(`}`);
  return lines.join('\n');
}

/**
 * Generate clean Python code from a CommandFlow
 */
export function flowToPython(flow: CommandFlow, commandName = 'command'): string {
  const trigger = flow.nodes.find(n => n.data.action === 'trigger');
  if (!trigger) return '# Flow missing trigger node';

  const lines: string[] = [
    `# Hawk Custom Command: !${commandName}`,
    ``,
    `async def execute(ctx):`,
  ];

  generateBodyCode(flow, trigger.id, lines, '    ', 'python');

  if (lines.length === 3) {
    lines.push('    pass');
  }

  return lines.join('\n');
}

function generateBodyCode(
  flow: CommandFlow,
  fromNodeId: string,
  lines: string[],
  indent: string,
  lang: 'ts' | 'js' | 'python'
): void {
  const visited = new Set<string>();

  function traverse(nodeId: string, currentIndent: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const outEdges = flow.edges.filter(e => e.source === nodeId);
    for (const edge of outEdges) {
      const targetNode = flow.nodes.find(n => n.id === edge.target);
      if (!targetNode) continue;

      const { action, args } = targetNode.data;

      // Handle conditional nodes
      if (['hasRole', 'hasPermission', 'inChannel'].includes(action)) {
        visited.add(targetNode.id);
        const yesEdge = flow.edges.find(e => e.source === targetNode.id && e.sourceHandle === 'yes');
        const noEdge = flow.edges.find(e => e.source === targetNode.id && e.sourceHandle === 'no');

        let conditionExpr = '';
        if (action === 'hasRole') {
          conditionExpr = lang === 'python'
            ? `ctx.has_role("${args.roleId || ''}")`
            : `ctx.hasRole("${args.roleId || ''}")`;
        } else if (action === 'hasPermission') {
          conditionExpr = lang === 'python'
            ? `ctx.has_permission("${args.permission || 'SendMessages'}")`
            : `ctx.hasPermission("${args.permission || 'SendMessages'}")`;
        } else if (action === 'inChannel') {
          conditionExpr = lang === 'python'
            ? `ctx.in_channel("${args.channelId || ''}")`
            : `ctx.inChannel("${args.channelId || ''}")`;
        }

        if (lang === 'python') {
          lines.push(`${currentIndent}if ${conditionExpr}:`);
          if (yesEdge) {
            traverse(yesEdge.target, currentIndent + '    ');
          } else {
            lines.push(`${currentIndent}    pass`);
          }
          if (noEdge) {
            lines.push(`${currentIndent}else:`);
            traverse(noEdge.target, currentIndent + '    ');
          }
        } else {
          lines.push(`${currentIndent}if (${conditionExpr}) {`);
          if (yesEdge) {
            traverse(yesEdge.target, currentIndent + '  ');
          }
          if (noEdge) {
            lines.push(`${currentIndent}} else {`);
            traverse(noEdge.target, currentIndent + '  ');
          }
          lines.push(`${currentIndent}}`);
        }
        continue;
      }

      // Handle action statements
      if (action === 'reply') {
        const text = String(args.text || 'Hello {user}');
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.reply(${JSON.stringify(text)})`);
        } else {
          lines.push(`${currentIndent}await ctx.reply(${JSON.stringify(text)});`);
        }
      } else if (action === 'send') {
        const ch = String(args.channelId || '');
        const text = String(args.text || '');
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.send(${JSON.stringify(ch)}, ${JSON.stringify(text)})`);
        } else {
          lines.push(`${currentIndent}await ctx.send(${JSON.stringify(ch)}, ${JSON.stringify(text)});`);
        }
      } else if (action === 'embed') {
        const ch = String(args.channelId || '');
        const title = String(args.title || '');
        const desc = String(args.description || '');
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.send_embed(channel_id=${JSON.stringify(ch)}, title=${JSON.stringify(title)}, description=${JSON.stringify(desc)})`);
        } else {
          lines.push(`${currentIndent}await ctx.sendEmbed({ channelId: ${JSON.stringify(ch)}, title: ${JSON.stringify(title)}, description: ${JSON.stringify(desc)} });`);
        }
      } else if (action === 'addRole') {
        const role = String(args.roleId || '');
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.add_role(${JSON.stringify(role)})`);
        } else {
          lines.push(`${currentIndent}await ctx.addRole(${JSON.stringify(role)});`);
        }
      } else if (action === 'removeRole') {
        const role = String(args.roleId || '');
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.remove_role(${JSON.stringify(role)})`);
        } else {
          lines.push(`${currentIndent}await ctx.removeRole(${JSON.stringify(role)});`);
        }
      } else if (action === 'wait') {
        const ms = Number(args.ms) || 1000;
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.wait(${ms})`);
        } else {
          lines.push(`${currentIndent}await ctx.wait(${ms});`);
        }
      } else if (action === 'react') {
        const emoji = String(args.emoji || '👍');
        if (lang === 'python') {
          lines.push(`${currentIndent}await ctx.react(${JSON.stringify(emoji)})`);
        } else {
          lines.push(`${currentIndent}await ctx.react(${JSON.stringify(emoji)});`);
        }
      }

      // Continue sequential traversal from this target
      traverse(targetNode.id, currentIndent);
    }
  }

  traverse(fromNodeId, indent);
}

/**
 * Convert any supported language script into a CommandFlow
 */
export function scriptToLanguageFlow(code: string, lang: SupportedScriptLanguage): CommandFlow {
  if (lang === 'flow') {
    return scriptToFlow(code);
  }

  // Parse TS, JS, or Python scripts
  return parseScriptToFlow(code, lang);
}

interface ParsedAction {
  action: FlowAction;
  args: Record<string, string | number>;
  condition?: {
    type: 'hasRole' | 'hasPermission' | 'inChannel';
    yesActions: ParsedAction[];
    noActions: ParsedAction[];
  };
}

/**
 * Universal tolerant parser for TypeScript, JavaScript, and Python command scripts
 */
export function parseScriptToFlow(code: string, _lang: 'typescript' | 'javascript' | 'python'): CommandFlow {
  if (!code || !code.trim()) {
    throw new Error('Script is empty. Write command actions to generate a flow.');
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Always create root trigger node
  const triggerId = 'trigger';
  nodes.push({
    id: triggerId,
    type: 'hawk',
    position: { x: 50, y: 120 },
    data: { action: 'trigger', args: {} },
  });

  const parsedActions: ParsedAction[] = [];

  // Normalize lines and strip comments
  const lines = code.split(/\r?\n/);
  
  let currentCondition: {
    type: 'hasRole' | 'hasPermission' | 'inChannel';
    args: Record<string, string | number>;
    branch: 'yes' | 'no';
    yesActions: ParsedAction[];
    noActions: ParsedAction[];
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines and full line comments
    if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }

    // Skip function definitions and imports
    if (
      line.startsWith('import ') ||
      line.startsWith('export default') ||
      line.startsWith('async def') ||
      line.startsWith('def ') ||
      line === '}' ||
      line === '{' ||
      line === 'pass'
    ) {
      continue;
    }

    // Check for if conditions
    const hasRoleMatch = line.match(/(?:if\s*\(?ctx\.(?:hasRole|has_role)\s*\(\s*["'](\d{17,20})["']\s*\))/);
    const hasPermMatch = line.match(/(?:if\s*\(?ctx\.(?:hasPermission|has_permission)\s*\(\s*["'](\w+)["']\s*\))/);
    const inChanMatch = line.match(/(?:if\s*\(?ctx\.(?:inChannel|in_channel)\s*\(\s*["'](\d{17,20})["']\s*\))/);

    if (hasRoleMatch) {
      if (currentCondition) {
        parsedActions.push({
          action: currentCondition.type,
          args: currentCondition.args,
          condition: {
            type: currentCondition.type,
            yesActions: currentCondition.yesActions,
            noActions: currentCondition.noActions,
          },
        });
      }
      currentCondition = {
        type: 'hasRole',
        args: { roleId: hasRoleMatch[1] },
        branch: 'yes',
        yesActions: [],
        noActions: [],
      };
      continue;
    }

    if (hasPermMatch) {
      if (currentCondition) {
        parsedActions.push({
          action: currentCondition.type,
          args: currentCondition.args,
          condition: {
            type: currentCondition.type,
            yesActions: currentCondition.yesActions,
            noActions: currentCondition.noActions,
          },
        });
      }
      currentCondition = {
        type: 'hasPermission',
        args: { permission: hasPermMatch[1] },
        branch: 'yes',
        yesActions: [],
        noActions: [],
      };
      continue;
    }

    if (inChanMatch) {
      if (currentCondition) {
        parsedActions.push({
          action: currentCondition.type,
          args: currentCondition.args,
          condition: {
            type: currentCondition.type,
            yesActions: currentCondition.yesActions,
            noActions: currentCondition.noActions,
          },
        });
      }
      currentCondition = {
        type: 'inChannel',
        args: { channelId: inChanMatch[1] },
        branch: 'yes',
        yesActions: [],
        noActions: [],
      };
      continue;
    }

    // Check for else branch
    if (line.startsWith('else:') || line.startsWith('} else {') || line.startsWith('else {')) {
      if (currentCondition) {
        currentCondition.branch = 'no';
      }
      continue;
    }

    // Parse actions
    const parsed = parseSingleAction(line);
    if (parsed) {
      if (currentCondition) {
        if (currentCondition.branch === 'yes') {
          currentCondition.yesActions.push(parsed);
        } else {
          currentCondition.noActions.push(parsed);
        }
      } else {
        parsedActions.push(parsed);
      }
    }
  }

  // Flush any open condition
  if (currentCondition) {
    parsedActions.push({
      action: currentCondition.type,
      args: currentCondition.args,
      condition: {
        type: currentCondition.type,
        yesActions: currentCondition.yesActions,
        noActions: currentCondition.noActions,
      },
    });
  }

  if (parsedActions.length === 0) {
    // If no actions parsed, create a default reply so user gets a working template
    parsedActions.push({ action: 'reply', args: { text: 'Hello {user}' } });
  }

  // Convert parsed action tree into FlowNodes and FlowEdges
  let lastNodeId = triggerId;
  let nodeCounter = 1;
  let xOffset = 300;
  let yOffset = 120;

  for (const actionItem of parsedActions) {
    if (actionItem.condition) {
      const condId = `${actionItem.action}_${nodeCounter++}`;
      nodes.push({
        id: condId,
        type: 'hawk',
        position: { x: xOffset, y: yOffset },
        data: { action: actionItem.action, args: actionItem.args },
      });
      edges.push({
        id: `e_${lastNodeId}_${condId}`,
        source: lastNodeId,
        target: condId,
      });

      // Yes branch
      let lastYesId = condId;
      let yesSourceHandle: string | undefined = 'yes';
      const yesY = yOffset - 70;
      let yesX = xOffset + 260;

      for (const ya of actionItem.condition.yesActions) {
        const yNodeId = `${ya.action}_${nodeCounter++}`;
        nodes.push({
          id: yNodeId,
          type: 'hawk',
          position: { x: yesX, y: yesY },
          data: { action: ya.action, args: ya.args },
        });
        edges.push({
          id: `e_${lastYesId}_${yNodeId}`,
          source: lastYesId,
          target: yNodeId,
          ...(yesSourceHandle ? { sourceHandle: yesSourceHandle } : {}),
        });
        lastYesId = yNodeId;
        yesSourceHandle = undefined;
        yesX += 240;
      }

      // No branch
      let lastNoId = condId;
      let noSourceHandle: string | undefined = 'no';
      const noY = yOffset + 70;
      let noX = xOffset + 260;

      for (const na of actionItem.condition.noActions) {
        const nNodeId = `${na.action}_${nodeCounter++}`;
        nodes.push({
          id: nNodeId,
          type: 'hawk',
          position: { x: noX, y: noY },
          data: { action: na.action, args: na.args },
        });
        edges.push({
          id: `e_${lastNoId}_${nNodeId}`,
          source: lastNoId,
          target: nNodeId,
          ...(noSourceHandle ? { sourceHandle: noSourceHandle } : {}),
        });
        lastNoId = nNodeId;
        noSourceHandle = undefined;
        noX += 240;
      }

      xOffset = Math.max(yesX, noX) + 50;
      lastNodeId = lastYesId !== condId ? lastYesId : condId;
    } else {
      const actId = `${actionItem.action}_${nodeCounter++}`;
      nodes.push({
        id: actId,
        type: 'hawk',
        position: { x: xOffset, y: yOffset },
        data: { action: actionItem.action, args: actionItem.args },
      });
      edges.push({
        id: `e_${lastNodeId}_${actId}`,
        source: lastNodeId,
        target: actId,
      });
      lastNodeId = actId;
      xOffset += 240;
    }
  }

  return validateFlow({ nodes, edges });
}

function parseSingleAction(line: string): ParsedAction | null {
  // reply
  const replyMatch = line.match(/(?:ctx\.reply|reply)\s*\(\s*(?:f?["'`]([\s\S]*?)["'`]|(\w+))\s*\)/);
  if (replyMatch) {
    return { action: 'reply', args: { text: replyMatch[1] || 'Hello {user}' } };
  }

  // send
  const sendMatch = line.match(/(?:ctx\.send|send)\s*\(\s*["'](\d{17,20})["']\s*,\s*["'`]([\s\S]*?)["'`]\s*\)/);
  if (sendMatch) {
    return { action: 'send', args: { channelId: sendMatch[1], text: sendMatch[2] } };
  }

  // embed
  const embedDescMatch = line.match(/(?:description|desc)\s*[:=]\s*["'`]([\s\S]*?)["'`]/);
  const embedTitleMatch = line.match(/title\s*[:=]\s*["'`]([\s\S]*?)["'`]/);
  const embedChMatch = line.match(/(?:channelId|channel_id)\s*[:=]\s*["'](\d{17,20})["']/);
  if (line.includes('sendEmbed') || line.includes('send_embed') || line.includes('embed(')) {
    return {
      action: 'embed',
      args: {
        channelId: embedChMatch ? embedChMatch[1] : '100000000000000001',
        title: embedTitleMatch ? embedTitleMatch[1] : 'Announcement',
        description: embedDescMatch ? embedDescMatch[1] : 'Embed message content',
      },
    };
  }

  // addRole
  const addRoleMatch = line.match(/(?:ctx\.addRole|ctx\.add_role|addRole)\s*\(\s*["'](\d{17,20})["']\s*\)/);
  if (addRoleMatch) {
    return { action: 'addRole', args: { roleId: addRoleMatch[1] } };
  }

  // removeRole
  const removeRoleMatch = line.match(/(?:ctx\.removeRole|ctx\.remove_role|removeRole)\s*\(\s*["'](\d{17,20})["']\s*\)/);
  if (removeRoleMatch) {
    return { action: 'removeRole', args: { roleId: removeRoleMatch[1] } };
  }

  // wait
  const waitMatch = line.match(/(?:ctx\.wait|wait|sleep)\s*\(\s*(\d+)\s*\)/);
  if (waitMatch) {
    return { action: 'wait', args: { ms: Number(waitMatch[1]) } };
  }

  // react
  const reactMatch = line.match(/(?:ctx\.react|react)\s*\(\s*["']([^"']+)["']\s*\)/);
  if (reactMatch) {
    return { action: 'react', args: { emoji: reactMatch[1] } };
  }

  return null;
}
