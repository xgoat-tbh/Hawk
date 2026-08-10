import { PermissionsBitField } from 'discord.js';
import type { GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext, CommandDefinition } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { fetchAnimeGif, buildActionPayload } from './_actionHandler.js';
import type { ActionInfo } from './_actionHandler.js';

export function createActionCommand(options: {
  name: string;
  aliases?: string[];
  emoji: string;
  verb: string;
  sendbackLabel: string;
  description: string;
  selfOnly?: boolean;
}): CommandDefinition {
  const actionInfo: ActionInfo = {
    name: options.name,
    emoji: options.emoji,
    verb: options.verb,
    sendbackLabel: options.sendbackLabel,
    selfOnly: options.selfOnly,
  };

  return defineCommand({
    name: options.name,
    aliases: options.aliases ?? [],
    module: 'actions',
    description: options.description,
    usage: `${options.name} [user]`,
    examples: [`${options.name}`, `${options.name} @User`],
    cooldown: 3,
    hidden: true, // HIDE FROM !help MENU
    permissions: [],
    botPermissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks],

    async execute(ctx: CommandContext): Promise<void> {
      const { parsed, guild, member, replyTarget, respond } = ctx;

      let targetMember: GuildMember | null = null;

      if (parsed.args.length > 0) {
        const userRes = await resolveUser(parsed.args.join(' '), guild);
        if (userRes.success && userRes.value.member) {
          targetMember = userRes.value.member;
        }
      } else if (replyTarget) {
        targetMember = replyTarget;
      }

      const gifUrl = await fetchAnimeGif(options.name);
      const payload = buildActionPayload(actionInfo, member, targetMember, gifUrl);

      await respond.raw({
        embeds: payload.embeds,
        components: payload.components,
      });
    },
  });
}
