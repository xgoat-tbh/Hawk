import type { ModuleManifest } from '../../types/module.js';
import { type Client, MessageFlags } from 'discord.js';
import { handlePvcButton } from './_pvcButtonHandler.js';
import { handlePvcSelect } from './_pvcSelectHandler.js';
import { handlePvcVoiceStateUpdate } from './_pvcGatekeeper.js';
import { startPvcScheduler, stopPvcScheduler } from './pvcScheduler.js';
import { reconcilePvcPermissions } from './pvcLifecycle.js';
import { getSessionByOwner, setUserLimit, buyPvcTime } from './pvcService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

let schedulerTimer: NodeJS.Timeout | null = null;
let reconciliationTimer: NodeJS.Timeout | null = null;

async function reconcilePermissions(client: Client): Promise<void> {
  try {
    await reconcilePvcPermissions(client);
    if (reconciliationTimer) clearInterval(reconciliationTimer);
    reconciliationTimer = null;
  } catch {
    console.warn('[PVC] Permission reconciliation deferred; retrying in 30 seconds.');
    if (!reconciliationTimer) {
      reconciliationTimer = setInterval(() => { void reconcilePermissions(client); }, 30_000);
      reconciliationTimer.unref();
    }
  }
}

export default {
  name: 'pvc',
  description: 'Private Voice Channel system',
  buttonPrefixes: ['pvc_btn_', 'btn_master_'],
  selectPrefixes: ['pvc_select_'],
  modalPrefixes: ['pvc_modal_'],
  
  onButton: async (interaction) => {
    await handlePvcButton(interaction);
  },
  
  onSelect: async (interaction) => {
    await handlePvcSelect(interaction);
  },
  
  onModal: async (interaction) => {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) return;

    const session = await getSessionByOwner(guildId, userId);
    if (!session) {
      await interaction.reply({ content: "You don't have an active PVC.", flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = (await interaction.guild?.channels.fetch(session.channelId).catch(() => null));

    if (interaction.customId === 'pvc_modal_rename') {
      const newName = interaction.fields.getTextInputValue('name');
      if (channel && channel.isVoiceBased()) {
        await channel.setName(newName);
      }
      await interaction.reply({ content: `PVC renamed to **${newName}**.`, flags: MessageFlags.Ephemeral });
    } else if (interaction.customId === 'pvc_modal_limit') {
      const limitStr = interaction.fields.getTextInputValue('limit');
      const limit = parseInt(limitStr, 10);
      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.reply({ content: 'Invalid limit. Must be between 0 and 99.', flags: MessageFlags.Ephemeral });
        return;
      }
      
      await setUserLimit(session.channelId, limit);
      if (channel && channel.isVoiceBased()) {
        await channel.setUserLimit(limit);
      }
      await interaction.reply({ content: `PVC user limit set to ${limit === 0 ? 'unlimited' : limit}.`, flags: MessageFlags.Ephemeral });
    } else if (interaction.customId === 'pvc_modal_buy') {
      const hoursStr = interaction.fields.getTextInputValue('hours');
      const hours = parseInt(hoursStr, 10);
      if (isNaN(hours) || hours <= 0 || hours > 720) {
        await interaction.reply({ content: 'Invalid hours. Must be a positive number up to 720.', flags: MessageFlags.Ephemeral });
        return;
      }

      const config = await getEconomyConfig(guildId);
      const cost = hours * config.pvcHourlyRate;
      try {
        await buyPvcTime(guildId, userId, hours, config.pvcHourlyRate);
        await interaction.reply({ content: `Successfully added **${hours} hour(s)** to your PVC for **${config.currencySymbol || '$'}${cost.toLocaleString()}**.`, flags: MessageFlags.Ephemeral });
      } catch (err: any) {
        await interaction.reply({ content: err.message || 'Failed to add hours. Please check your economy balance.', flags: MessageFlags.Ephemeral });
      }
    }
  },
  
  onVoiceStateUpdate: async (oldState, newState) => {
    await handlePvcVoiceStateUpdate(oldState, newState);
  },
  
  onReady: async (client: Client) => {
    schedulerTimer = startPvcScheduler(client);
    await reconcilePermissions(client);
  },
  
  onShutdown: async () => {
    if (reconciliationTimer) clearInterval(reconciliationTimer);
    reconciliationTimer = null;
    if (schedulerTimer) {
      stopPvcScheduler(schedulerTimer);
    }
  }
} satisfies ModuleManifest;
