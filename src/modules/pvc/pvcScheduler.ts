import type { Client, TextChannel } from 'discord.js';
import { getExpiringSessionsForAutoPay, getSessionsExpiringWithin, getExpiredSessions, getSessionByOwner, reservePvcTime, deleteSession } from './pvcService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { withPvcOwnerLock } from './pvcLocks.js';
import { EmbedBuilder } from 'discord.js';

export async function checkPvcExpirations(client: Client): Promise<void> {
  // 1. Get sessions with autoPayEnabled where expires_at <= NOW() + 2 minutes
  const autoPaySessions = await getExpiringSessionsForAutoPay(2);
  
  for (const observed of autoPaySessions) {
    await withPvcOwnerLock(observed.guildId, observed.ownerId, async () => {
      const current = await getSessionByOwner(observed.guildId, observed.ownerId);
      if (!current?.autoPayEnabled || current.expiresAt.getTime() > Date.now() + 120_000) return;
      const config = await getEconomyConfig(current.guildId);
      try { await reservePvcTime(current.guildId, current.ownerId, 1, config.pvcHourlyRate); }
      catch { /* Insufficient funds: leave the paid session until its expiry. */ }
    });
  }

  // 3. Get sessions expiring within 10 minutes (and not auto-pay), send warning
  // Warning happens once per session, we don't have a flag to prevent spam, but let's assume we fetch them and just warn.
  // Actually the prompt says "Get sessions expiring within 10 minutes (and not auto-pay), send warning to pvcCommandChannelId"
  const expiring = await getSessionsExpiringWithin(10);
  for (const session of expiring) {
    if (session.autoPayEnabled) continue;
    // We should ideally track if we already warned, but skipping for simplicity as per requirements.
    const config = await getEconomyConfig(session.guildId);
    if (config.pvcCommandChannelId) {
      const guild = client.guilds.cache.get(session.guildId);
      if (guild) {
        const channel = (await guild.channels.fetch(config.pvcCommandChannelId).catch(() => null)) as TextChannel;
        if (channel) {
          // Send warning if we haven't warned recently (this might spam every 30 seconds for 10 minutes, so maybe only warn if strictly within 9.5 to 10 minutes?
          // To avoid complexity just warn if between 9 to 10 mins
          const minutesLeft = (session.expiresAt.getTime() - Date.now()) / 60000;
          if (minutesLeft > 9 && minutesLeft <= 10) {
            const embed = new EmbedBuilder()
              .setTitle('PVC Expiring Soon')
              .setDescription(`<@${session.ownerId}>, your PVC <#${session.channelId}> will expire in less than 10 minutes.\nUse \`!pvc buy\` or enable FASTag to keep it open.`)
              .setColor('#FFA500');
            await channel.send({ embeds: [embed] }).catch(() => {});
          }
        }
      }
    }
  }
  
  // 4. Get expired sessions: disconnect all members, delete Discord channel, delete from DB
  const expired = await getExpiredSessions();
  for (const observed of expired) {
    await withPvcOwnerLock(observed.guildId, observed.ownerId, async () => {
      const current = await getSessionByOwner(observed.guildId, observed.ownerId);
      if (!current || current.expiresAt.getTime() > Date.now()) return;
      const guild = client.guilds.cache.get(current.guildId);
      if (guild && !current.channelId.startsWith('pending-')) {
        const channel = await guild.channels.fetch(current.channelId).catch(() => null);
        if (channel?.isVoiceBased()) {
          for (const [, member] of channel.members) await member.voice.disconnect('PVC Expired').catch(() => {});
          // Preserve the DB session on a failed deletion so the next tick retries it.
          await channel.delete('PVC Expired');
        }
      }
      await deleteSession(current.channelId);
    });
  }
}

export function startPvcScheduler(client: Client): NodeJS.Timeout {
  return setInterval(() => {
    checkPvcExpirations(client).catch((err: any) => {
      const code = err?.code || err?.cause?.code || err?.name || '';
      const msg = String(err?.message || '') + ' ' + String(err?.cause?.message || '');
      const isTransient =
        code === 'CONNECT_TIMEOUT' ||
        code === 'ETIMEDOUT' ||
        code === 'EAI_AGAIN' ||
        code === 'ENOTFOUND' ||
        code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        code === 'EPIPE' ||
        code === 'ENETUNREACH' ||
        code === '57P01' ||
        code === '57P02' ||
        code === '57P03' ||
        msg.includes('CONNECT_TIMEOUT') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('EAI_AGAIN') ||
        msg.includes('getaddrinfo') ||
        msg.includes('Connection terminated') ||
        msg.includes('Connection closed');

      if (isTransient) {
        console.warn(`[PVC Scheduler] Transient database network glitch (${code || 'timeout'}). Retrying on next tick...`);
      } else {
        console.error('PVC Scheduler Error:', err);
      }
    });
  }, 30000);
}

export function stopPvcScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer);
}
