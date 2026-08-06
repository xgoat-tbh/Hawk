import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'vcmute',
  aliases: ['vm', 'voicemute', 'vmute'],
  module: 'moderation',
  description: 'Server mute one or multiple members in voice.',
  usage: 'vcmute <targets...>',
  examples: ['vcmute @User', 'vcmute @User1 @User2'],
  permissions: [PermissionsBitField.Flags.MuteMembers],
  botPermissions: [PermissionsBitField.Flags.MuteMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Usage: `?vcmute <targets...>`');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const arg of parsed.args) {
      const res = await resolveUser(arg, guild);
      if (res.success && res.value.member) {
        const targetMember = res.value.member;
        if (targetMember.voice.channel) {
          try {
            await targetMember.voice.setMute(true);
            successCount++;
          } catch {
            failCount++;
          }
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    await respond.success(`Muted **${successCount}** user(s) in voice.${failCount > 0 ? ` Failed/Not in VC: ${failCount}` : ''}`);

    logEvent('info', 'command_execution', `VCMute by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      successCount,
      failCount,
    });
  },
});
