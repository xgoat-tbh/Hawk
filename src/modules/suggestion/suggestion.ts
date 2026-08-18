import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveChannel } from '../../core/resolver/ChannelResolver.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import {
  setSuggestionChannel,
  getSuggestionChannel,
  setSuggestionPanelMessageId,
  addBlacklist,
  removeBlacklist,
  listBlacklist,
  resetSuggestionDataForGuild,
} from '../../core/database/repositories/suggestionRepo.js';
import { buildSuggestionPanelPayload } from './suggestionUI.js';
import { registerSuggestionPanelChannel } from './_suggestionHandler.js';
import { mentionChannel, mentionUser, bold } from '../../core/utils/formatters.js';
import { ui } from '../../core/ui/index.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

import acceptCmd from './accept.js';
import considerCmd from './consider.js';
import denyCmd from './deny.js';

export default defineCommand({
  name: 'suggestion',
  module: 'suggestion',
  description: 'Manage Suggestion module channel, panel, blacklist, status, or reset.',
  usage: 'suggestion <channel|panel|blacklist|accept|consider|deny|reset> [args...]',
  examples: [
    'suggestion channel #suggestions',
    'suggestion panel',
    'suggestion accept 42 Approved',
    'suggestion consider 42 Looking into it',
    'suggestion deny 42 Not feasible',
    'suggestion blacklist add @User',
    'suggestion reset confirm',
  ],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Specify a subcommand: `channel`, `panel`, `blacklist`, `accept`, `consider`, `deny`, or `reset`.');
      return;
    }

    const subcommand = parsed.args[0].toLowerCase();
    const subArgs = parsed.args.slice(1);

    // Create a sub-context where parsed.args is shifted by 1
    const subCtx: CommandContext = {
      ...ctx,
      parsed: {
        ...ctx.parsed,
        args: subArgs,
        rawArgs: subArgs.join(' '),
      },
    };

    switch (subcommand) {
      case 'channel':
        await handleChannelConfig(ctx, subArgs);
        break;

      case 'panel':
        await handlePanelConfig(ctx);
        break;

      case 'blacklist':
        await handleBlacklist(ctx, subArgs);
        break;

      case 'accept':
        await acceptCmd.execute(subCtx);
        break;

      case 'consider':
        await considerCmd.execute(subCtx);
        break;

      case 'deny':
        await denyCmd.execute(subCtx);
        break;

      case 'reset':
      case 'nuke':
        await handleReset(ctx, subArgs);
        break;

      default:
        await respond.error(`Unknown subcommand \`${subcommand}\`. Valid options: \`channel\`, \`panel\`, \`blacklist\`, \`accept\`, \`consider\`, \`deny\`, \`reset\`.`);
        break;
    }
  },
});

async function handleChannelConfig(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member } = ctx;

  if (args.length === 0) {
    const current = await getSuggestionChannel(guild.id);
    if (current) {
      await respond.info(`The current suggestion channel is ${mentionChannel(current)}.`);
    } else {
      await respond.info(`No suggestion channel has been configured yet. Use \`${ctx.parsed.prefix}suggestion channel <#channel>\`.`);
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
    await respond.error('The suggestion channel must be a text-based channel.');
    return;
  }

  const prevChannel = await getSuggestionChannel(guild.id);
  await setSuggestionChannel(guild.id, channel.id);
  registerSuggestionPanelChannel(channel.id);

  await respond.success(`Suggestion channel configured to ${mentionChannel(channel.id)}.`);

  logEvent('info', 'command_execution', `Suggestion channel configured by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    previousChannel: prevChannel ?? 'none',
    newChannel: channel.id,
  });
}

async function handlePanelConfig(ctx: CommandContext): Promise<void> {
  const { guild, respond, member } = ctx;

  const channelId = await getSuggestionChannel(guild.id);
  if (!channelId) {
    await respond.error(`Please configure a suggestion channel first using \`${ctx.parsed.prefix}suggestion channel <#channel>\`.`);
    return;
  }

  const channel = (await guild.channels.fetch(channelId).catch(() => null)) as GuildTextBasedChannel | null;
  if (!channel) {
    await respond.error('The configured suggestion channel no longer exists. Please re-configure it.');
    return;
  }

  const payload = buildSuggestionPanelPayload();
  const panelMsg = await channel.send(payload);

  await setSuggestionPanelMessageId(guild.id, panelMsg.id);

  await respond.success(`Suggestion panel posted to ${mentionChannel(channel.id)}.`);

  logEvent('info', 'command_execution', `Suggestion panel posted by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    channelId: channel.id,
  });
}

async function handleBlacklist(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member } = ctx;

  if (args.length === 0) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}suggestion blacklist <add|remove|list> [user]\``);
    return;
  }

  const action = args[0].toLowerCase();

  if (action === 'list' || action === 'show') {
    const records = await listBlacklist(guild.id);
    if (records.length === 0) {
      await respond.info('No users are currently blacklisted from suggestions.');
      return;
    }
    const lines = records.map(r => `• ${mentionUser(r.userId)} (\`${r.userId}\`)`);
    await ui.paginated(ctx, {
      title: 'Blacklisted Suggestion Users',
      items: lines,
      pageSize: 10,
      emptyText: 'No users are currently blacklisted from suggestions.',
    });
    return;
  }

  if (args.length < 2) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}suggestion blacklist ${action} <user>\``);
    return;
  }

  const userResult = await resolveUser(args[1], guild);
  if (!userResult.success) {
    await respond.error(`User: ${userResult.error}`);
    return;
  }

  const targetUser = userResult.value.user;

  if (action === 'add' || action === 'block') {
    const added = await addBlacklist(guild.id, targetUser.id, member.id);
    if (added) {
      await respond.success(`Blacklisted ${mentionUser(targetUser.id)} from submitting suggestions.`);
    } else {
      await respond.warning(`${mentionUser(targetUser.id)} is already blacklisted.`);
    }

    logEvent('info', 'command_execution', `User ${targetUser.tag} blacklisted by ${member.user.tag}`, {
      administrator: member.user.tag,
      adminId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetUser: targetUser.tag,
      targetUserId: targetUser.id,
      action: 'add',
    });
    return;
  }

  if (action === 'remove' || action === 'unblock') {
    const removed = await removeBlacklist(guild.id, targetUser.id);
    if (removed) {
      await respond.success(`Removed ${mentionUser(targetUser.id)} from the suggestion blacklist.`);
    } else {
      await respond.warning(`${mentionUser(targetUser.id)} is not blacklisted.`);
    }

    logEvent('info', 'command_execution', `User ${targetUser.tag} unblacklisted by ${member.user.tag}`, {
      administrator: member.user.tag,
      adminId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetUser: targetUser.tag,
      targetUserId: targetUser.id,
      action: 'remove',
    });
    return;
  }

  await respond.error('Invalid blacklist action. Use `add`, `remove`, or `list`.');
}

async function handleReset(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member } = ctx;

  if (args.length === 0 || args[0].toLowerCase() !== 'confirm') {
    await respond.warning(
      `⚠️ ${bold('DESTRUCTIVE OPERATION')}: Resetting suggestions will delete all suggestion history, vote records, suggestion counters, and blacklist data for this server.\n\nTo confirm, run: \`${ctx.parsed.prefix}suggestion reset confirm\``,
    );
    return;
  }

  await resetSuggestionDataForGuild(guild.id);

  await respond.success('Suggestion module data has been completely reset for this server.');

  logEvent('warning', 'command_execution', `Suggestion data reset for ${guild.name} by ${member.user.tag}`, {
    administrator: member.user.tag,
    adminId: member.id,
    guild: guild.name,
    guildId: guild.id,
    operation: 'reset',
  });
}
