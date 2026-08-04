import type { Message, GuildTextBasedChannel, GuildMember } from 'discord.js';
import type { CommandContext, ParsedCommand } from '../../types/command.js';
import type { PermissionContext } from '../../types/permission.js';
import { parseCommand } from '../parser/PrefixParser.js';
import { tokenize } from '../parser/ArgumentTokenizer.js';
import { resolveCommand, isRegistered } from './CommandRegistry.js';
import { checkPermission, checkBotPermissions, getAuthorityLevel } from '../permissions/PermissionChecker.js';
import { checkRestrictions } from '../restrictions/RestrictionChecker.js';
import { isIgnored } from '../ignore/IgnoreChecker.js';
import { checkCooldown, setCooldown } from '../cooldowns/CooldownManager.js';
import { ResponseBuilder } from '../responses/ResponseBuilder.js';
import { logCommand, logEvent } from '../logging/WebhookLogger.js';
import { getUserMessage, getInternalMessage, BotError } from '../errors/BotError.js';
import { getPrefix } from '../database/repositories/guildConfigRepo.js';
import { AuthorityLevel } from '../../types/permission.js';
import { isNoPrefixEnabled } from '../config/NoPrefixConfig.js';

function tryNoPrefixParse(content: string): ParsedCommand | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  const spaceIndex = trimmed.indexOf(' ');
  const firstWord = (spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)).toLowerCase();

  if (!isRegistered(firstWord)) return null;

  const rawArgs = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1).trim();
  const { args, tokens } = tokenize(rawArgs);

  return {
    prefix: '',
    commandName: firstWord,
    aliasUsed: firstWord,
    rawArgs,
    args,
    tokens,
  };
}

export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.member) return;

  const channel = message.channel;
  if (!channel.isTextBased() || channel.isDMBased()) return;
  const guildChannel = channel as GuildTextBasedChannel;

  const prefix = await getPrefix(message.guild.id);
  let parsed = parseCommand(message.content, prefix);
  if (!parsed && isNoPrefixEnabled(message.guild.id, message.author.id)) {
    parsed = tryNoPrefixParse(message.content);
  }
  if (!parsed) return;

  const command = resolveCommand(parsed.commandName);
  if (!command) return;

  parsed.aliasUsed = parsed.commandName;
  parsed.commandName = command.name;
  if (!command.enabled) return;

  const categoryId = ('parentId' in guildChannel && guildChannel.parentId) ? guildChannel.parentId : null;
  const permCtx: PermissionContext = {
    userId: message.author.id, guildId: message.guild.id, guildOwnerId: message.guild.ownerId,
    memberRoleIds: Array.from(message.member.roles.cache.keys()),
    commandName: command.name, moduleName: command.module, channelId: guildChannel.id, categoryId,
  };

  const respond = new ResponseBuilder(message);

  // Auto-cleanup after 7 seconds for action voice commands (excluding informational lookups: wv, invc, vconfig)
  const isAutoCleanVoiceCmd = command.module === 'voice' && !['wv', 'invc', 'vconfig'].includes(command.name);
  if (isAutoCleanVoiceCmd) {
    respond.enableAutoClean(7000);
  }

  const authority = getAuthorityLevel(message.author.id, message.guild.ownerId);

  if (authority < AuthorityLevel.ServerAdmin) {
    const ignored = await isIgnored(message.guild.id, message.author.id, permCtx.memberRoleIds, guildChannel.id, categoryId, command.name, command.module, message.member.roles.cache);
    if (ignored) return;
  }

  const permResult = await checkPermission(command, permCtx, message.member);
  if (!permResult.allowed) {
    await respond.denied(permResult.reason);
    logEvent('info', 'permission_denial', `${message.author.tag} denied: ${command.name}`, { user: message.author.id, guild: message.guild.id, reason: permResult.reason });
    return;
  }

  const restrictResult = await checkRestrictions(permCtx, permResult.authority);
  if (!restrictResult.allowed) {
    await respond.denied(restrictResult.reason);
    return;
  }

  if (command.botPermissions.length > 0) {
    const botMember = message.guild.members.me;
    if (botMember) {
      const botPerms = checkBotPermissions(botMember, command.botPermissions);
      if (!botPerms.hasAll) { await respond.error(`I'm missing the following permissions: ${botPerms.missing.join(', ')}`); return; }
    }
  }

  const remaining = checkCooldown(message.author.id, command.name, command.cooldown, permResult.authority);
  if (remaining > 0) { await respond.warning(`Please wait **${remaining}s** before using this command again.`); return; }

  let replyTarget: GuildMember | null = null;
  if (message.reference?.messageId) {
    try {
      let referenced = (message as unknown as { referencedMessage?: Message | null }).referencedMessage;
      if (!referenced) {
        referenced = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      }
      if (referenced?.author) {
        replyTarget = await message.guild.members.fetch(referenced.author.id).catch(() => null);
      }
    } catch {
      // Optional resolution
    }
  }

  const ctx: CommandContext = {
    message,
    replyTarget,
    command,
    parsed: parsed as ParsedCommand,
    guild: message.guild,
    member: message.member,
    channel: guildChannel,
    respond,
  };

  try {
    await command.execute(ctx);
    setCooldown(message.author.id, command.name, command.cooldown);
    logCommand({ guildId: message.guild.id, guildName: message.guild.name, channelId: guildChannel.id, channelName: guildChannel.name, userId: message.author.id, userTag: message.author.tag, commandName: command.name, aliasUsed: parsed.aliasUsed, rawContent: message.content, rawArgs: parsed.rawArgs, success: true });
  } catch (error) {
    const userMsg = getUserMessage(error);
    const internalMsg = getInternalMessage(error);
    if (error instanceof BotError) { await respond.error(userMsg).catch(() => {}); } else { await respond.error('An unexpected error occurred.').catch(() => {}); }
    logCommand({ guildId: message.guild.id, guildName: message.guild.name, channelId: guildChannel.id, channelName: guildChannel.name, userId: message.author.id, userTag: message.author.tag, commandName: command.name, aliasUsed: parsed.aliasUsed, rawContent: message.content, rawArgs: parsed.rawArgs, success: false, error: internalMsg });
    logEvent('error', 'command_failure', `Command ${command.name} failed`, { error: internalMsg, user: message.author.id, guild: message.guild.id });
  }
}
