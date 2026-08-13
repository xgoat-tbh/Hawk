import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type Client,
} from 'discord.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { getDb } from '../../core/database/pool.js';
import { sanitize } from '../../core/utils/validators.js';

export interface PingData {
  wsLatency: number;
  roundtripLatency: number;
  dbLatency: number;
}

export async function measurePing(client: Client, messageTimestamp?: number): Promise<PingData> {
  const wsLatency = Math.max(0, Math.round(client.ws.ping));
  const startTime = Date.now();
  const roundtripLatency = messageTimestamp ? Math.max(0, startTime - messageTimestamp) : wsLatency;

  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    const db = getDb();
    await db`SELECT 1 as ping`;
    dbLatency = Date.now() - dbStart;
  } catch {
    dbLatency = -1;
  }

  return { wsLatency, roundtripLatency, dbLatency };
}

function getStatusBadge(ms: number): string {
  if (ms < 0) return '`Error`';
  if (ms < 100) return '`Optimal`';
  if (ms < 250) return '`Normal`';
  return '`Degraded`';
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export function buildPingV2Embed(data: PingData, userId: string): ComponentV2Payload {
  const { wsLatency, roundtripLatency, dbLatency } = data;
  const memory = process.memoryUsage();
  const heapUsedMb = (memory.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMb = (memory.heapTotal / 1024 / 1024).toFixed(1);
  const rssMb = (memory.rss / 1024 / 1024).toFixed(1);
  const uptimeStr = formatUptime(process.uptime());

  const dbStatusStr = dbLatency >= 0 ? `\`${dbLatency}ms\` ${getStatusBadge(dbLatency)}` : '`Disconnected`';

  const section1 =
    `# Hawk Network & System Telemetry\n\n` +
    `**Connection Latencies**\n` +
    `• **WebSocket Gateway:** \`${wsLatency}ms\` ${getStatusBadge(wsLatency)}\n` +
    `• **Message Roundtrip:** \`${roundtripLatency}ms\` ${getStatusBadge(roundtripLatency)}\n` +
    `• **PostgreSQL Database:** ${dbStatusStr}`;

  const section2 =
    `**System Resources & Environment**\n` +
    `• **Bot Uptime:** \`${uptimeStr}\`\n` +
    `• **RAM Heap:** \`${heapUsedMb} MB\` / \`${heapTotalMb} MB\` *(RSS: \`${rssMb} MB\`)*\n` +
    `• **Runtime:** Node.js \`${process.version}\` | \`discord.js v14.18.0\``;

  const refreshBtn = new ButtonBuilder()
    .setCustomId(`ping_refresh_${userId}`)
    .setLabel('Refresh Latency')
    .setStyle(ButtonStyle.Secondary);

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshBtn);

  return buildV2Container({
    text: sanitize(section1),
    sections: [sanitize(section2)],
    components: [actionRow],
  });
}

export async function handlePingRefresh(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split('_');
  const userId = parts[2];

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Only the command invoker can refresh this panel.', flags: MessageFlags.Ephemeral });
    return;
  }

  const pingData = await measurePing(interaction.client);
  const payload = buildPingV2Embed(pingData, userId);
  await interaction.update(payload);
}
