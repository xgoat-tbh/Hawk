import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type Client,
  type Guild,
} from 'discord.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { getCommandCount } from '../../core/commands/CommandRegistry.js';
import { buildMainHelpEmbed } from './helpUI.js';
import { getPrefix } from '../../core/database/repositories/guildConfigRepo.js';
import { env } from '../../core/config/environment.js';
import { sanitize } from '../../core/utils/validators.js';

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

export function buildInfoV2Embed(client: Client, _guild: Guild, prefix: string, userId: string): ComponentV2Payload {
  const botUser = client.user;
  const botTag = botUser?.tag ?? 'Hawk Bot';
  const botId = botUser?.id ?? '';
  const totalGuilds = client.guilds.cache.size;
  const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount ?? 0), 0);
  const totalChannels = client.channels.cache.size;
  const commandCount = getCommandCount();

  const memory = process.memoryUsage();
  const heapUsedMb = (memory.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMb = (memory.heapTotal / 1024 / 1024).toFixed(1);
  const rssMb = (memory.rss / 1024 / 1024).toFixed(1);
  const uptimeStr = formatUptime(process.uptime());

  const ownersList = env.botOwnerIds.length > 0
    ? env.botOwnerIds.map(id => `<@${id}>`).join(', ')
    : `<@${env.botOwnerId}>`;

  const filteredAdmins = env.botAdminIds.filter(id => !env.botOwnerIds.includes(id));
  const adminsList = filteredAdmins.length > 0
    ? filteredAdmins.map(id => `<@${id}>`).join(', ')
    : 'None';

  const section1 =
    `# 🦅 Hawk Core Information & Specifications\n\n` +
    `> Next-generation, prefix-based Discord bot designed for speed, privacy & voice channel management.\n\n` +
    `**🤖 Bot Profile**\n` +
    `• **Identity:** ${botTag} (<@${botId}>)\n` +
    `• **Command Prefix:** \`${prefix}\`\n` +
    `• **Total Commands:** \`${commandCount}\` active commands\n` +
    `• **Version:** \`1.0.0\` (Components V2 Supported)\n\n` +
    `**👑 Bot Leadership & Administration**\n` +
    `• **Bot Owners:** ${ownersList}\n` +
    `• **Bot Admins:** ${adminsList}`;

  const section2 =
    `**📊 Global Network Telemetry**\n` +
    `• **Guilds Served:** \`${totalGuilds.toLocaleString()}\` servers\n` +
    `• **Members Managed:** \`${totalUsers.toLocaleString()}\` users\n` +
    `• **Cached Channels:** \`${totalChannels.toLocaleString()}\` channels\n\n` +
    `**💻 Infrastructure & Health**\n` +
    `• **Process Uptime:** \`${uptimeStr}\`\n` +
    `• **RAM Memory:** \`${heapUsedMb} MB\` / \`${heapTotalMb} MB\` *(RSS: \`${rssMb} MB\`)*\n` +
    `• **Database:** PostgreSQL Connected 🟢\n` +
    `• **Environment:** Node.js \`${process.version}\` | \`discord.js v14.18.0\``;

  const refreshBtn = new ButtonBuilder()
    .setCustomId(`info_refresh_${userId}`)
    .setLabel('Refresh Telemetry')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🔄');

  const helpBtn = new ButtonBuilder()
    .setCustomId(`info_help_${userId}`)
    .setLabel('Open Help Menu')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('📚');

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshBtn, helpBtn);

  return buildV2Container({
    text: sanitize(section1),
    sections: [sanitize(section2)],
    components: [actionRow],
  });
}

export async function handleInfoInteraction(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split('_');
  const action = parts[1]; // 'refresh' or 'help'
  const userId = parts[2];

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'Only the command invoker can use these buttons.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (action === 'refresh') {
    if (!interaction.guild) return;
    const prefix = await getPrefix(interaction.guild.id);
    const payload = buildInfoV2Embed(interaction.client, interaction.guild, prefix, userId);
    await interaction.update(payload);
  } else if (action === 'help') {
    const prefix = interaction.guild ? await getPrefix(interaction.guild.id) : '!';
    const payload = buildMainHelpEmbed(prefix, userId);
    await interaction.update(payload);
  }
}
