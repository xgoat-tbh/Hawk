import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type Client,
} from 'discord.js';
import { ui, type ComponentV2Payload } from '../../core/ui/index.js';
import { getDb } from '../../core/database/pool.js';

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

export function buildPingV2Embed(data: PingData, userId: string): ComponentV2Payload {
  const { wsLatency, roundtripLatency, dbLatency } = data;
  const memory = process.memoryUsage();
  const heapUsedMb = (memory.heapUsed / 1024 / 1024).toFixed(1);
  const dbStatusStr = dbLatency >= 0 ? `\`${dbLatency}ms\`` : '`Error`';

  const content =
    `• **Gateway Latency:** \`${wsLatency}ms\`\n` +
    `• **Message Roundtrip:** \`${roundtripLatency}ms\`\n` +
    `• **Database Latency:** ${dbStatusStr}\n` +
    `• **Memory Usage:** \`${heapUsedMb} MB\` heap`;

  const refreshBtn = new ButtonBuilder()
    .setCustomId(`ping_refresh_${userId}`)
    .setLabel('Refresh')
    .setStyle(ButtonStyle.Secondary);

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshBtn);

  return ui.standard({
    title: 'Amo System Latency',
    text: content,
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
