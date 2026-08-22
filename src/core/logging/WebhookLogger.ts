import { env, isDev } from '../config/environment.js';
import { constants } from '../config/constants.js';
import { consoleLog } from './ConsoleLogger.js';
import type { LogSeverity, LogCategory, CommandLogEvent } from '../../types/logging.js';
import { truncate } from '../utils/validators.js';

interface QueuedLog { content: string; timestamp: number; }

const queue: QueuedLog[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let lastSend = 0;

export function startWebhookLogger(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushQueue, constants.webhookFlushInterval);
  flushTimer.unref();
}

export async function stopWebhookLogger(): Promise<void> {
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  await flushQueue();
}

export function logEvent(severity: LogSeverity, category: LogCategory, message: string, details?: Record<string, unknown>): void {
  if (isDev()) consoleLog(severity, category, message, details);
  if (severity === 'debug') return;

  const emoji = severityEmoji(severity);
  const detailLines = details ? Object.entries(details).map(([k, v]) => `**${k}:** ${String(v)}`).join('\n') : '';
  const content = [`${emoji} **[${severity.toUpperCase()}]** \`${category}\``, message, detailLines].filter(Boolean).join('\n');
  enqueue(truncate(content, 1900));
}

export function logCommand(event: CommandLogEvent): void {
  const outcomeKey = event.outcome || (event.success ? 'success' : 'fail');
  if (isDev()) consoleLog('info', 'command_execution', `${event.userTag} used ${event.commandName} [${outcomeKey}]`, { guild: event.guildName, channel: event.channelName, args: event.rawArgs });

  let statusEmoji = '\u2705'; // green check
  if (outcomeKey === 'fail') statusEmoji = '\u274c'; // red cross
  else if (outcomeKey === 'warning') statusEmoji = '\u26a0\ufe0f'; // warning
  else if (outcomeKey === 'info') statusEmoji = '\u2139\ufe0f'; // info
  else if (outcomeKey === 'denied') statusEmoji = '\ud83d\udeab'; // no entry
  else if (outcomeKey === 'cooldown') statusEmoji = '\u23f3'; // hourglass
  else if (outcomeKey === 'maintenance') statusEmoji = '\ud83d\udee0\ufe0f'; // wrench
  else if (outcomeKey === 'ignored') statusEmoji = '\ud83d\udd07'; // mute/ignored

  const content = [
    `${statusEmoji} **Command Triggered** \`[${outcomeKey.toUpperCase()}]\``,
    `• **Who:** ${event.userTag} (\`${event.userId}\`)`,
    `• **Where:** ${event.guildName} \u2192 #${event.channelName}`,
    `• **Command:** \`${event.commandName}\`${event.aliasUsed !== event.commandName ? ` (alias: \`${event.aliasUsed}\`)` : ''}`,
    `• **Full:** \`${truncate(event.rawContent, 400)}\``,
    event.responseSnippet ? `• **Reply:** \`${truncate(event.responseSnippet, 250)}\`` : '',
    event.resolvedTargets?.length ? `• **Targets:** ${event.resolvedTargets.join(', ')}` : '',
    event.error ? `• **Reason / Error:** ${event.error}` : '',
  ].filter(Boolean).join('\n');
  enqueue(truncate(content, 1900));
}

function enqueue(content: string): void {
  queue.push({ content, timestamp: Date.now() });
  if (queue.length >= constants.webhookBatchSize) void flushQueue();
}

async function flushQueue(): Promise<void> {
  if (queue.length === 0) return;
  if (!env.devWebhookUrl) {
    queue.length = 0;
    return;
  }
  const now = Date.now();
  if (now - lastSend < constants.webhookMinInterval) return;

  const batch = queue.splice(0, constants.webhookBatchSize);
  const combined = batch.map(q => q.content).join('\n\n---\n\n');
  lastSend = now;

  try {
    await fetch(env.devWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: truncate(combined, 1950), username: 'Dev Logs' }) });
  } catch (error) {
    consoleLog('error', 'api_error', `Webhook send failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function severityEmoji(severity: LogSeverity): string {
  switch (severity) { case 'debug': return '\ud83d\udd0d'; case 'info': return '\u2139\ufe0f'; case 'warning': return '\u26a0\ufe0f'; case 'error': return '\u274c'; case 'critical': return '\ud83d\udea8'; }
}
