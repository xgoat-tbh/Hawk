import type { AnySelectMenuInteraction } from 'discord.js';

import { getSessionByOwner, addAccess, removeAccess } from './pvcService.js';
import { transferOwnership } from './pvcService.js';

export async function handlePvcSelect(interaction: AnySelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  if (!guildId) return;

  const session = await getSessionByOwner(guildId, userId);
  if (!session) {
    await interaction.reply({ content: "You don't have an active PVC.", ephemeral: true });
    return;
  }

  const channel = interaction.guild?.channels.cache.get(session.channelId);

  if (interaction.customId === 'pvc_select_add_user' && interaction.isUserSelectMenu()) {
    const users = interaction.users;
    if (channel && channel.isVoiceBased()) {
      for (const [id, _] of users) {
        await addAccess(session.channelId, id, 'USER', 'ALLOW');
        await channel.permissionOverwrites.edit(id, {
          Connect: true,
          ViewChannel: true,
          Speak: true
        });
      }
    }
    await interaction.reply({ content: `Added ${users.size} users to your PVC.`, ephemeral: true });
  } 
  else if (interaction.customId === 'pvc_select_remove_user' && interaction.isStringSelectMenu()) {
    const ids = interaction.values;
    if (channel && channel.isVoiceBased()) {
      for (const id of ids) {
        await removeAccess(session.channelId, id);
        await channel.permissionOverwrites.delete(id);
        const member = channel.members.get(id);
        if (member) {
          await member.voice.disconnect('Removed from PVC').catch(() => {});
        }
      }
    }
    await interaction.reply({ content: `Removed ${ids.length} users from your PVC.`, ephemeral: true });
  }
  else if (interaction.customId === 'pvc_select_transfer' && interaction.isUserSelectMenu()) {
    const newOwnerId = interaction.values[0];
    await transferOwnership(session.channelId, newOwnerId);
    if (channel && channel.isVoiceBased()) {
        await channel.permissionOverwrites.delete(userId);
        await channel.permissionOverwrites.edit(newOwnerId, {
            Connect: true,
            Speak: true,
            ManageChannels: true,
            ViewChannel: true
        });
    }
    await interaction.reply({ content: `Transferred ownership to <@${newOwnerId}>.`, ephemeral: true });
  }
  else {
    await interaction.reply({ content: 'Unknown action.', ephemeral: true });
  }
}
