import type { VoiceState, TextChannel, VoiceChannel, OverwriteResolvable } from 'discord.js';
import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { getSessionByOwner, reservePvcTime, getAccessList } from './pvcService.js';
import { getDb } from '../../core/database/pool.js';
import { cleanupEmptyPvc, stripLegacyOwnerGrant, withPvcOwnerLock } from './pvcLifecycle.js';

export async function handlePvcVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const guild = newState.guild;
  const config = await getEconomyConfig(guild.id);
  if (config.pvcJtcChannelId && newState.channelId === config.pvcJtcChannelId && oldState.channelId !== newState.channelId && newState.member) {
    const member = newState.member;
    await withPvcOwnerLock(guild.id, member.id, async () => {
      let existing = await getSessionByOwner(guild.id, member.id);
      const needsPurchase = !existing || existing.expiresAt <= new Date();
      try {
        if (needsPurchase) {
          existing = await reservePvcTime(guild.id, member.id, 1, config.pvcHourlyRate);
        }
        let vc = existing && !existing.channelId.startsWith('pending-')
          ? await guild.channels.fetch(existing.channelId).catch(() => null) as VoiceChannel | null : null;
        if (vc && vc.type !== ChannelType.GuildVoice) throw new Error('PVC is not a voice channel');
        const db = getDb();
        if (!vc) {
          const access = existing ? await getAccessList(existing.channelId) : [];
          const overwrites: OverwriteResolvable[] = [
            { id: guild.roles.everyone.id, allow: [], deny: [
              ...(existing?.isHidden ? [PermissionFlagsBits.ViewChannel] : []),
              ...(existing?.isLocked ? [PermissionFlagsBits.Connect] : []),
            ] },
            { id: member.id, type: 1, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel] },
            ...access.filter(entry => entry.targetId !== member.id && entry.targetId !== guild.roles.everyone.id).map(entry => ({
              id: entry.targetId, type: entry.targetType === 'ROLE' ? 0 as const : 1 as const,
              allow: entry.access === 'ALLOW' ? [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel] : [],
              deny: entry.access === 'DENY' ? [PermissionFlagsBits.Connect] : [],
            })),
          ];
          vc = await guild.channels.create({
            name: existing?.roomName || `${member.user.username}'s PVC`, type: ChannelType.GuildVoice,
            parent: config.pvcCategoryId || undefined, permissionOverwrites: overwrites,
            userLimit: existing?.userLimit || 0,
            bitrate: existing?.bitrate ? Math.min(existing.bitrate, guild.maximumBitrate) : undefined,
          });
          try {
            if (!existing) throw new Error('PVC rental reservation missing');
            // ACL foreign keys follow the new ID; rental expiry and settings remain intact.
            const updated = await db`UPDATE pvc_sessions SET channel_id = ${vc.id} WHERE channel_id = ${existing.channelId} AND guild_id = ${guild.id} RETURNING channel_id`;
            if (!updated.length) throw new Error('PVC rental attachment failed');
          } catch (error) {
            await vc.delete('PVC rental attachment failed').catch(failure => console.error('[PVC] Could not remove unattached channel:', failure));
            throw error;
          }
        }
        await stripLegacyOwnerGrant(vc, member.id);
        await member.voice.setChannel(vc).catch(() => {});
      } catch (error) {
        if (!(error instanceof Error) || !['Insufficient funds', 'No balance record found'].includes(error.message)) throw error;
        await member.voice.disconnect('Insufficient funds for PVC').catch(() => {});
        if (config.pvcCommandChannelId) {
          const channel = await guild.channels.fetch(config.pvcCommandChannelId).catch(() => null) as TextChannel | null;
          if (channel?.isTextBased()) {
            const embed = new EmbedBuilder().setTitle('Insufficient Funds')
              .setDescription(`<@${member.id}>, you do not have enough funds to create a PVC. Use \`!pvc buy <hours>\` to purchase VC time. Hourly rate is **${config.pvcHourlyRate}**.`)
              .setColor('#FF0000');
            await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
          }
        }
      }
    });
  }
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    await cleanupEmptyPvc(guild, oldState.channelId);
  }
}
