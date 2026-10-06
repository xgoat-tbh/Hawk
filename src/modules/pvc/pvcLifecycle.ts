import { PermissionFlagsBits, type Client, type Guild, type VoiceChannel } from 'discord.js';
import { getDb } from '../../core/database/pool.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { getSession, getSessionByOwner } from './pvcService.js';
import { withPvcOwnerLock } from './pvcLocks.js';
export { withPvcOwnerLock } from './pvcLocks.js';

export async function stripLegacyOwnerGrant(channel: VoiceChannel, ownerId: string): Promise<void> {
  if (channel.permissionOverwrites.cache.get(ownerId)?.allow.has(PermissionFlagsBits.ManageChannels)) {
    await channel.permissionOverwrites.edit(ownerId, { ManageChannels: null });
  }
}

export async function reconcilePvcPermissions(client: Client): Promise<void> {
  const db = getDb();
  const sessions = await db`SELECT guild_id, owner_id, channel_id FROM pvc_sessions WHERE channel_id NOT LIKE 'pending-%'`;
  const failures: unknown[] = [];
  for (const session of sessions) {
    const guild = client.guilds.cache.get(session.guild_id);
    if (!guild) continue;
    try {
      await withPvcOwnerLock(guild.id, session.owner_id, async () => {
        const channel = await guild.channels.fetch(session.channel_id);
        if (channel?.type === 2) await stripLegacyOwnerGrant(channel as VoiceChannel, session.owner_id);
      });
    } catch (error) {
      // A deleted channel needs no overwrite repair. Transient/API failures must retry.
      if ((error as { code?: number })?.code !== 10003) failures.push(error);
    }
  }
  if (failures.length) throw new AggregateError(failures, 'PVC permission reconciliation incomplete');
}

export async function cleanupEmptyPvc(guild: Guild, channelId: string): Promise<void> {
  const config = await getEconomyConfig(guild.id);
  if (!config.autoCleanup) return;
  const observed = await getSession(channelId);
  if (!observed || observed.guildId !== guild.id) return;
  await withPvcOwnerLock(guild.id, observed.ownerId, async () => {
    const session = await getSessionByOwner(guild.id, observed.ownerId);
    if (!session || session.channelId !== channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isVoiceBased() || channel.members.size > 0) return;
    const db = getDb();
    // Save metadata before Discord deletion so a DB retry cannot lose room settings.
    await db`UPDATE pvc_sessions SET room_name = ${channel.name}, bitrate = ${channel.bitrate} WHERE channel_id = ${channelId} AND guild_id = ${guild.id}`;
    if (channel.members.size > 0) return;
    await channel.delete('PVC empty room auto-cleanup');
    await db`UPDATE pvc_sessions SET channel_id = ${`pending-${guild.id}-${session.ownerId}`} WHERE channel_id = ${channelId} AND guild_id = ${guild.id}`;
  });
}
