import type { ButtonInteraction } from 'discord.js';
import type { ModuleManifest } from '../../types/module.js';
import { handleDragmeInteraction } from './_dragmeHandler.js';
import { handleVConfigFallback } from './vconfig.js';
import { handleFmvVoiceStateUpdate } from './FmvManager.js';

export default {
  name: 'voice',
  description: 'Voice channel movement, FMV, dragme, and vconfig controls',
  buttonPrefixes: ['dragme_', 'vconfig_'],
  channelSelectPrefixes: ['vconfig_'],
  onButton: async (interaction: ButtonInteraction) => {
    if (interaction.customId.startsWith('dragme_')) {
      await handleDragmeInteraction(interaction);
    } else if (interaction.customId.startsWith('vconfig_')) {
      await handleVConfigFallback(interaction);
    }
  },
  onChannelSelect: handleVConfigFallback,
  onVoiceStateUpdate: handleFmvVoiceStateUpdate,
} satisfies ModuleManifest;
