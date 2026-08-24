import { handleDragmeInteraction } from './_dragmeHandler.js';
import { handleVConfigFallback } from './vconfig.js';
import { handleFmvVoiceStateUpdate } from './FmvManager.js';
import { handleVclockUnlockButton } from './vclock.js';
export default {
    name: 'voice',
    description: 'Voice channel movement, mass moderation, FMV, dragme, and vconfig controls',
    buttonPrefixes: ['dragme_', 'vconfig_', 'vclock_unlock_'],
    channelSelectPrefixes: ['vconfig_'],
    onButton: async (interaction) => {
        if (interaction.customId.startsWith('dragme_')) {
            await handleDragmeInteraction(interaction);
        }
        else if (interaction.customId.startsWith('vconfig_')) {
            await handleVConfigFallback(interaction);
        }
        else if (interaction.customId.startsWith('vclock_unlock_')) {
            await handleVclockUnlockButton(interaction);
        }
    },
    onChannelSelect: handleVConfigFallback,
    onVoiceStateUpdate: handleFmvVoiceStateUpdate,
};
//# sourceMappingURL=_module.js.map