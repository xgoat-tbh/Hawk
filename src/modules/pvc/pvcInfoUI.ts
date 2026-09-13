import type { Client } from 'discord.js';
import { ui } from '../../core/ui/index.js';
import type { PvcSession, PvcAccessEntry } from './pvcService.js';

export function buildPvcInfoPayload(
  session: PvcSession,
  ownerName: string,
  accessList: PvcAccessEntry[],
  _client?: Client,
): { components: any[]; flags?: any } {
  const fastagBadge = session.autoPayEnabled ? '`Enabled`' : '`Disabled`';
  const lockStatus = session.isLocked ? '`Locked`' : '`Unlocked`';
  const hideStatus = session.isHidden ? '`Hidden`' : '`Visible`';
  const userLimit = session.userLimit ? `\`${session.userLimit}\`` : '`Unlimited`';
  const expiryTimestamp = Math.floor(session.expiresAt.getTime() / 1000);

  const allowedUsers = accessList.filter(a => a.access === 'ALLOW' && a.targetType === 'USER');
  const permittedStr = allowedUsers.length > 0
    ? allowedUsers.map(a => `<@${a.targetId}>`).join(', ')
    : '*None*';

  const content =
    `• **Owner:** **${ownerName}**\n` +
    `• **Room Status:** ${lockStatus} · ${hideStatus}\n` +
    `• **Member Limit:** ${userLimit}\n` +
    `• **FASTag Auto-Pay:** ${fastagBadge}\n` +
    `• **Room Expiry:** <t:${expiryTimestamp}:R> (<t:${expiryTimestamp}:t>)\n` +
    `• **Permitted Members:** ${permittedStr}`;

  const payload = ui.standard({
    title: 'PVC Session Info',
    text: content,
  });

  return { components: payload.components, flags: payload.flags as any };
}

export function buildPvcInfoEmbed(
  session: PvcSession,
  ownerName: string,
  accessList: PvcAccessEntry[],
  client: Client,
): { embeds: any[]; components: any[]; flags?: any } {
  const payload = buildPvcInfoPayload(session, ownerName, accessList, client);
  return { embeds: [], components: payload.components, flags: payload.flags };
}

