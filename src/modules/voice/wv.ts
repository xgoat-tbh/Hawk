import {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type GuildMember,
  type GuildTextBasedChannel,
} from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { mentionChannel } from '../../core/utils/formatters.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';

export default defineCommand({
  name: 'wv',
  aliases: ['whichvc'],
  module: 'voice',
  description: 'Check which voice channel a user is in.',
  usage: 'wv [user]',
  examples: ['wv', 'wv @User', 'wv 123456789012345678'],
  permissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, replyTarget } = ctx;

    let targetMember: GuildMember;

    if (parsed.args.length > 0) {
      const result = await resolveUser(parsed.args.join(' '), guild);
      if (!result.success) {
        await respond.error(result.error);
        return;
      }
      if (!result.value.member) {
        await respond.error('That user is not a member of this server.');
        return;
      }
      targetMember = result.value.member;
    } else if (replyTarget) {
      targetMember = replyTarget;
    } else {
      targetMember = member;
    }

    const voiceState = targetMember.voice;
    if (!voiceState.channel) {
      await respond.send(`* **${targetMember.user.username}** is not in a voice channel.`);
      return;
    }

    const access = await checkVoiceAccess(guild.id, member, 'wv', voiceState.channel.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const chan = voiceState.channel;
    const count = chan.members.size;
    const limit = 'userLimit' in chan && chan.userLimit && chan.userLimit > 0 ? `${chan.userLimit}` : 'Unlimited';
    const targetName = targetMember.displayName || targetMember.user.username;

    // Check permissions and capacity for the invoking user to join
    const userPerms = chan.permissionsFor(member);
    const canConnect = Boolean(userPerms?.has(PermissionsBitField.Flags.Connect));
    const isFull = Boolean(
      chan.userLimit &&
      chan.userLimit > 0 &&
      count >= chan.userLimit &&
      !userPerms?.has(PermissionsBitField.Flags.MoveMembers) &&
      !userPerms?.has(PermissionsBitField.Flags.Administrator)
    );

    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (canConnect && !isFull) {
      const joinBtn = new ButtonBuilder()
        .setLabel('Join VC')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${chan.id}`);

      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn));
    }

    const payload = buildV2Container({
      text:
        `• **Member:** **${targetName}** is in ${mentionChannel(chan.id)}\n` +
        `• **Occupancy:** \`${count}/${limit}\` connected`,
      components,
    });

    await (ctx.channel as GuildTextBasedChannel).send(payload);
  },
});
