import {
  type ButtonInteraction,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} from 'discord.js';
import { getSessionByOwner, setLocked, setHidden, setAutoPayEnabled, deleteSession } from './pvcService.js';
import { createRenameModal, createLimitModal, createBuyHoursModal } from './pvcModals.js';
import { buildPvcInfoEmbed } from './pvcInfoUI.js';
import { getAccessList } from './pvcService.js';

export async function handlePvcButton(interaction: ButtonInteraction): Promise<void> {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  if (!guildId) return;

  // Resolve session (owner or master panel action)
  const session = await getSessionByOwner(guildId, userId);
  
  // If master panel buttons, user might be acting on their PVC from the panel
  if (!session) {
    // Maybe they are clicking from an Info panel inside their own PVC, or maybe from master panel
    // Wait, the master panel buttons are just aliases to the normal buttons, they act on the user's active session.
    // If no session:
    await interaction.reply({ content: "You don't have an active PVC.", flags: MessageFlags.Ephemeral });
    return;
  }

  const channel = interaction.guild?.channels.cache.get(session.channelId);

  switch (interaction.customId) {
    case 'pvc_btn_lock':
    case 'btn_master_lock': {
      const newLocked = !session.isLocked;
      await setLocked(session.channelId, newLocked);
      if (channel && channel.isVoiceBased()) {
        await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone.id, {
          Connect: newLocked ? false : null
        });
      }
      await interaction.reply({ content: `PVC has been ${newLocked ? 'locked' : 'unlocked'}.`, flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_hide':
    case 'btn_master_hide': {
      const newHidden = !session.isHidden;
      await setHidden(session.channelId, newHidden);
      if (channel && channel.isVoiceBased()) {
        await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone.id, {
          ViewChannel: newHidden ? false : null
        });
      }
      await interaction.reply({ content: `PVC has been ${newHidden ? 'hidden' : 'unhidden'}.`, flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_fastag':
    case 'btn_master_fastag': {
      const newFastag = !session.autoPayEnabled;
      await setAutoPayEnabled(session.channelId, newFastag);
      await interaction.reply({ content: `FASTag (Auto-Pay) is now ${newFastag ? 'enabled' : 'disabled'}.`, flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_delete':
    case 'btn_master_delete': {
      if (channel) {
        await channel.delete('User deleted PVC').catch(() => {});
      }
      await deleteSession(session.channelId);
      await interaction.reply({ content: 'PVC deleted successfully.', flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_rename':
    case 'btn_master_rename': {
      const modal = createRenameModal();
      await interaction.showModal(modal);
      break;
    }
    
    case 'pvc_btn_limit':
    case 'btn_master_limit': {
      const modal = createLimitModal();
      await interaction.showModal(modal);
      break;
    }
    
    case 'pvc_btn_transfer':
    case 'btn_master_transfer': {
      const select = new UserSelectMenuBuilder()
        .setCustomId('pvc_select_transfer')
        .setPlaceholder('Select a user to transfer ownership to')
        .setMinValues(1)
        .setMaxValues(1);
      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select);
      await interaction.reply({ content: 'Select new owner:', components: [row], flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_friends':
    case 'btn_master_friends': {
      // add friends logic - here we just show a user select menu for them to pick users
      const select = new UserSelectMenuBuilder()
        .setCustomId('pvc_select_add_user') // reuse add user select
        .setPlaceholder('Select friends to add to PVC')
        .setMinValues(1)
        .setMaxValues(10);
      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select);
      await interaction.reply({ content: 'Select friends to add:', components: [row], flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_info':
    case 'btn_master_info': {
      const accessList = await getAccessList(session.channelId);
      const { embeds, components } = buildPvcInfoEmbed(session, interaction.user.username, accessList, interaction.client);
      await interaction.reply({ embeds, components, flags: MessageFlags.Ephemeral });
      break;
    }

    case 'pvc_btn_add_hours':
    case 'btn_master_add_hours': {
      const modal = createBuyHoursModal();
      await interaction.showModal(modal);
      break;
    }

    case 'pvc_btn_trust':
    case 'btn_master_trust':
    case 'btn_master_add_user': {
      const select = new UserSelectMenuBuilder()
        .setCustomId('pvc_select_add_user')
        .setPlaceholder('Select users to trust/permit in PVC')
        .setMinValues(1)
        .setMaxValues(10);
      const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select);
      await interaction.reply({ content: 'Select users to trust/permit in your PVC:', components: [row], flags: MessageFlags.Ephemeral });
      break;
    }

    case 'pvc_btn_remove_user':
    case 'btn_master_remove_user': {
      const accessList = await getAccessList(session.channelId);
      const allowedUsers = accessList.filter(a => a.access === 'ALLOW' && a.targetType === 'USER');
      const userMap = new Map<string, string>();
      for (const a of allowedUsers) {
        userMap.set(a.targetId, `Allowed Member: ${a.targetId}`);
      }
      if (channel && channel.isVoiceBased()) {
        for (const [memberId, member] of channel.members) {
          if (memberId !== userId) {
            userMap.set(memberId, member.user.username ? `${member.user.username} (in voice)` : `Member in VC: ${memberId}`);
          }
        }
      }
      if (userMap.size === 0) {
        await interaction.reply({ content: 'No users to remove or kick.', flags: MessageFlags.Ephemeral });
        return;
      }
      const select = new StringSelectMenuBuilder()
        .setCustomId('pvc_select_remove_user')
        .setPlaceholder('Select users to untrust / kick from VC')
        .setMinValues(1)
        .setMaxValues(Math.min(userMap.size, 10));
      for (const [targetId, label] of Array.from(userMap.entries()).slice(0, 25)) {
        select.addOptions({ label: label.slice(0, 100), value: targetId });
      }
      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
      await interaction.reply({ content: 'Select users to untrust and kick:', components: [row], flags: MessageFlags.Ephemeral });
      break;
    }
    
    case 'pvc_btn_privacy':
    case 'btn_master_privacy': {
      const isPrivate = session.isLocked && session.isHidden;
      const newLocked = !isPrivate;
      const newHidden = !isPrivate;
      await setLocked(session.channelId, newLocked);
      await setHidden(session.channelId, newHidden);
      if (channel && channel.isVoiceBased()) {
        await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone.id, {
          Connect: newLocked ? false : null,
          ViewChannel: newHidden ? false : null
        });
      }
      await interaction.reply({ content: `PVC is now ${newLocked ? 'Private (Locked & Hidden)' : 'Open'}.`, flags: MessageFlags.Ephemeral });
      break;
    }

    default:
      await interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
      break;
  }
}
