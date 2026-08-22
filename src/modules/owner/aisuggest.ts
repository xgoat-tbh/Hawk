import {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
} from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { env } from '../../core/config/environment.js';
import { resolveChannel } from '../../core/resolver/ChannelResolver.js';
import {
  getAiSuggestChannel,
  setAiSuggestChannel,
  getTelemetryStats,
} from '../../core/database/repositories/telemetryRepo.js';
import {
  generateAiServerInsights,
  buildAiReportComponentsV2,
} from '../../core/ai/AiAdvisorEngine.js';
import { ui } from '../../core/ui/index.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'aisuggest',
  aliases: ['aiadvisor', 'aidev'],
  module: 'owner',
  description: 'Configure and run AI server intelligence and feature suggestions (Bot Owner only).',
  usage: 'aisuggest [channel <#channel|disable>|run|status]',
  examples: [
    'aisuggest',
    'aisuggest channel #dev-suggestions',
    'aisuggest channel disable',
    'aisuggest run',
    'aisuggest status',
  ],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, member, guild, channel, respond } = ctx;
    const authority = getAuthorityLevel(member.id, guild.ownerId);

    if (authority !== AuthorityLevel.Owner) {
      await respond.error('Only **Bot Owners** can configure and run the AI Server Intelligence Advisor.');
      return;
    }

    const sub = parsed.args[0]?.toLowerCase();

    // ── Subcommand: channel ──
    if (sub === 'channel') {
      const targetArg = parsed.args[1];
      if (!targetArg) {
        await respond.error(`Usage: \`${parsed.prefix}aisuggest channel <#channel|disable>\``);
        return;
      }

      if (targetArg.toLowerCase() === 'disable' || targetArg.toLowerCase() === 'off' || targetArg.toLowerCase() === 'none') {
        await setAiSuggestChannel(guild.id, null);
        await respond.success('Disabled automated daily AI suggestions for this server.');
        logAuditAction({
          guild,
          action: 'AI Suggestions Channel Disabled',
          executor: member,
        });
        return;
      }

      const chanRes = resolveChannel(targetArg, guild);
      if (!chanRes.success) {
        await respond.error(`Channel: ${chanRes.error}`);
        return;
      }

      const targetChan = chanRes.value.channel;
      if (targetChan.type !== ChannelType.GuildText && targetChan.type !== ChannelType.GuildAnnouncement) {
        await respond.error('Target channel must be a text or announcement channel.');
        return;
      }

      await setAiSuggestChannel(guild.id, targetChan.id);
      await respond.success(`Configured **<#${targetChan.id}>** as the dedicated AI suggestions channel. Daily analysis reports will be delivered here.`);

      logAuditAction({
        guild,
        action: 'AI Suggestions Channel Configured',
        executor: member,
        details: [`• **Channel:** <#${targetChan.id}>`],
      });

      logEvent('info', 'config_change', `AI Suggestions channel set to #${targetChan.name} in ${guild.name} by ${member.user.tag}`);
      return;
    }

    // ── Subcommand: run ──
    if (sub === 'run' || sub === 'analyze') {
      await respond.info('🧠 **Analyzing server telemetry, role dynamics, and command patterns with AI...**');

      const report = await generateAiServerInsights(guild);
      const payload = buildAiReportComponentsV2(report);

      const targetChannelId = await getAiSuggestChannel(guild.id);
      let destinationChannel: GuildTextBasedChannel = channel;

      if (targetChannelId) {
        const configuredChan = guild.channels.cache.get(targetChannelId) as GuildTextBasedChannel | undefined;
        if (configuredChan && 'send' in configuredChan) {
          destinationChannel = configuredChan;
        }
      }

      await destinationChannel.send({
        components: payload.components,
        flags: payload.flags as any,
        allowedMentions: { parse: [], roles: [], users: [] },
      });

      if (destinationChannel.id !== channel.id) {
        await respond.success(`AI Server Intelligence report generated and posted in <#${destinationChannel.id}>.`);
      }

      logEvent('info', 'command_execution', `On-demand AI Server Intelligence run triggered by ${member.user.tag}`, {
        guild: guild.name,
        suggestionsCount: report.suggestions.length,
      });
      return;
    }

    // ── Status & Default Overview ──
    const targetChannelId = await getAiSuggestChannel(guild.id);
    const telemetry = await getTelemetryStats(guild.id, 7);
    const modelName = env.geminiApiKey ? 'Google Gemini 2.0 Flash' : 'Built-in Heuristic Analysis (Offline/Fallback)';

    const details = [
      `• **AI Engine:** \`${modelName}\``,
      `• **Target Channel:** ${targetChannelId ? `<#${targetChannelId}>` : '*Not configured (Run `aisuggest channel #channel`)*'}`,
      `• **7-Day Telemetry:** \`${telemetry.totalExecutions}\` commands tracked`,
      `• **Active Users Analyzed:** \`${telemetry.uniqueUsersCount}\` members`,
      `• **Top Command:** ${telemetry.topCommands[0] ? `\`${telemetry.topCommands[0].commandName}\` (${telemetry.topCommands[0].count} uses)` : '*None recorded yet*'}`,
      '',
      '*Daily automated digests are delivered to the target channel every 24 hours.*',
    ].join('\n');

    const runBtn = new ButtonBuilder()
      .setCustomId('ai_trigger_now')
      .setLabel('Run Analysis Now')
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(runBtn);

    const payload = ui.standard({
      title: 'AI Server Intelligence & Feature Advisor',
      text: details,
      components: [actionRow],
    });

    const sentMsg = await respond.raw({
      components: payload.components,
      flags: payload.flags as any,
    });

    const collector = sentMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === member.id,
      time: 60_000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'ai_trigger_now') {
        await interaction.reply({
          content: '🧠 Generating AI analysis report...',
          flags: 64 as any,
        }).catch(() => {});

        const report = await generateAiServerInsights(guild);
        const reportPayload = buildAiReportComponentsV2(report);

        await (channel as GuildTextBasedChannel).send({
          components: reportPayload.components,
          flags: reportPayload.flags as any,
          allowedMentions: { parse: [], roles: [], users: [] },
        });
      }
    });

    collector.on('end', () => {
      sentMsg.edit({ components: [] }).catch(() => {});
    });
  },
});
