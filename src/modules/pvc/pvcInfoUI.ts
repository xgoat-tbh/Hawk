import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  type Client
} from 'discord.js';
import type { PvcSession, PvcAccessEntry } from './pvcService.js';

export function buildPvcInfoEmbed(
  session: PvcSession,
  ownerName: string,
  accessList: PvcAccessEntry[],
  client: Client
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<any>[] } {
  const fastagBadge = session.autoPayEnabled ? ' [FASTag]' : '';
  
  const embed = new EmbedBuilder()
    .setTitle(`Private Voice Channel Info`)
    .setColor('#2F3136')
    .addFields(
      { name: 'Owner', value: `${ownerName}${fastagBadge}`, inline: true },
      { name: 'Expires At', value: `<t:${Math.floor(session.expiresAt.getTime() / 1000)}:R>`, inline: true },
      { name: 'Status', value: `${session.isLocked ? 'Locked' : 'Unlocked'} | ${session.isHidden ? 'Hidden' : 'Visible'}`, inline: true },
      { name: 'User Limit', value: session.userLimit ? session.userLimit.toString() : 'Unlimited', inline: true }
    );
    
  const allowedUsers = accessList.filter(a => a.access === 'ALLOW' && a.targetType === 'USER');
  if (allowedUsers.length > 0) {
    const mentions = allowedUsers.map(a => `<@${a.targetId}>`).join(', ');
    embed.addFields({ name: 'Permitted Members', value: mentions, inline: false });
  } else {
    embed.addFields({ name: 'Permitted Members', value: 'None', inline: false });
  }
  
  const components: ActionRowBuilder<any>[] = [];
  
  // Row 1: Add User
  const addUserSelect = new UserSelectMenuBuilder()
    .setCustomId('pvc_select_add_user')
    .setPlaceholder('Add members to your PVC')
    .setMinValues(1)
    .setMaxValues(10);
  components.push(new ActionRowBuilder().addComponents(addUserSelect));
  
  // Row 2: Remove User
  if (allowedUsers.length > 0) {
    const removeUserSelect = new StringSelectMenuBuilder()
      .setCustomId('pvc_select_remove_user')
      .setPlaceholder('Remove members from your PVC')
      .setMinValues(1)
      .setMaxValues(Math.min(allowedUsers.length, 10));
      
    for (const a of allowedUsers.slice(0, 25)) {
      const u = client?.users?.cache?.get(a.targetId);
      removeUserSelect.addOptions({
        label: u ? u.username : `User ${a.targetId}`,
        value: a.targetId
      });
    }
    components.push(new ActionRowBuilder().addComponents(removeUserSelect));
  }
  
  // Row 3: Buttons 
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pvc_btn_lock').setLabel(session.isLocked ? 'Unlock' : 'Lock').setStyle(session.isLocked ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('pvc_btn_hide').setLabel(session.isHidden ? 'Unhide' : 'Hide').setStyle(session.isHidden ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('pvc_btn_fastag').setLabel('FASTag').setStyle(session.autoPayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('pvc_btn_delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
  );
  components.push(row3);
  
  // Row 4: Buttons
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pvc_btn_rename').setLabel('Rename').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pvc_btn_limit').setLabel('Set Limit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pvc_btn_transfer').setLabel('Transfer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pvc_btn_friends').setLabel('Add Friends').setStyle(ButtonStyle.Secondary)
  );
  components.push(row4);

  return { embeds: [embed], components };
}
