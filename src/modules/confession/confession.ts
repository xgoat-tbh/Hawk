import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveChannel } from '../../core/resolver/ChannelResolver.js';
import {
  setConfessionChannel,
  getConfessionChannel,
  setConfessionLogChannel,
  getConfessionLogChannel,
  setConfessionPanelMessageId,
  resetConfessionDataForGuild,
} from '../../core/database/repositories/confessionRepo.js';
import { buildConfessionPanel } from './confessionUI.js';
import { registerConfessionPanelChannel } from './_confessionHandler.js';
import { mentionChannel, bold } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'confession',
  module: 'confession',
  description: 'Manage Confession module channel, log channel, submission panel, or perform a reset.',
  usage: 'confession <channel|log|panel|reset> [args...]',
  examples: [
    'confession channel #confessions',
    'confession log #mod-logs',
    'confession log none',
    'confession panel',
    'confession reset confirm',
  ],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Specify a subcommand: `channel`, `log`, `panel`, or `reset`.');
      return;
    }

    const subcommand = parsed.args[0].toLowerCase();
    const subArgs = parsed.args.slice(1);

    switch (subcommand) {
      case 'channel':
        await handleChannelConfig(ctx, subArgs);
        break;

      case 'log':
      case 'logchannel':
      case 'logs':
      case 'modlog':
        await handleLogConfig(ctx, subArgs);
        break;

      case 'panel':
      case 'sendpanel':
        await handlePanel(ctx);
        break;

      case 'reset':
      case 'nuke':
        await handleReset(ctx, subArgs);
        break;

      default:
        await respond.error(`Unknown subcommand \`${subcommand}\`. Valid options: \`channel\`, \`log\`, \`panel\`, \`reset\`.`);
        break;
    }
  },
});

async function handleChannelConfig(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member } = ctx;

  if (args.length === 0) {
    const current = await getConfessionChannel(guild.id);
    const prefix = ctx.parsed.prefix;
    if (current) {
      await respond.info(`The current confession channel is ${mentionChannel(current)}.`);
    } else {
      await respond.info(`No confession channel has been configured yet. Use \`${prefix}confession channel <#channel>\`.`);
    }
    return;
  }

  const channelResult = resolveChannel(args[0], guild);
  if (!channelResult.success) {
    await respond.error(`Channel: ${channelResult.error}`);
    return;
  }

  const channel = channelResult.value.channel;
  if (!channel.isTextBased()) {
    await respond.error('The confession channel must be a text-based channel.');
    return;
  }

  const prevChannel = await getConfessionChannel(guild.id);
  await setConfessionChannel(guild.id, channel.id);
  registerConfessionPanelChannel(channel.id);

  await respond.success(`Confession destination channel configured to ${mentionChannel(channel.id)}.`);

  logEvent('info', 'command_execution', `Confession channel configured by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    previousChannel: prevChannel ?? 'none',
    newChannel: channel.id,
  });
}

async function handleLogConfig(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member } = ctx;

  if (args.length === 0) {
    const current = await getConfessionLogChannel(guild.id);
    const prefix = ctx.parsed.prefix;
    if (current) {
      await respond.info(`The current confession log channel is ${mentionChannel(current)}.`);
    } else {
      await respond.info(`No confession log channel is currently configured. Use \`${prefix}confession log <#channel>\`.`);
    }
    return;
  }

  const input = args[0].toLowerCase();
  if (['none', 'off', 'disable', 'delete', 'remove', 'clear'].includes(input)) {
    await setConfessionLogChannel(guild.id, null);
    await respond.success('Confession log channel configuration removed.');
    return;
  }

  const channelResult = resolveChannel(args[0], guild);
  if (!channelResult.success) {
    await respond.error(`Channel: ${channelResult.error}`);
    return;
  }

  const channel = channelResult.value.channel;
  if (!channel.isTextBased()) {
    await respond.error('The confession log channel must be a text-based channel.');
    return;
  }

  await setConfessionLogChannel(guild.id, channel.id);
  await respond.success(`Confession log channel configured to ${mentionChannel(channel.id)}.`);

  logEvent('info', 'command_execution', `Confession log channel configured by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    logChannel: channel.id,
  });
}

async function handlePanel(ctx: CommandContext): Promise<void> {
  const { channel, respond, member, guild } = ctx;

  const textChannel = channel as GuildTextBasedChannel;
  const panel = buildConfessionPanel();

  const panelMsg = await textChannel.send({
    components: panel.components,
    flags: panel.flags as any,
    allowedMentions: { parse: [], roles: [], users: [] },
  });
  await setConfessionPanelMessageId(guild.id, panelMsg.id);

  await respond.success('Confession submission panel has been posted.');

  logEvent('info', 'command_execution', `Confession panel posted by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    channel: channel.name,
  });
}

async function handleReset(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member } = ctx;

  if (args.length === 0 || args[0].toLowerCase() !== 'confirm') {
    const prefix = ctx.parsed.prefix;
    await respond.warning(
      `${bold('DESTRUCTIVE OPERATION')}: Resetting confessions will delete all confession records and channel configuration for this server.\n\nTo confirm, run: \`${prefix}confession reset confirm\``,
    );
    return;
  }

  await resetConfessionDataForGuild(guild.id);

  await respond.success('Confession module data has been completely reset for this server.');

  logEvent('warning', 'command_execution', `Confession data reset for ${guild.name} by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    operation: 'reset',
  });
}
