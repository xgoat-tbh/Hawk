import { handlePvcButton } from './_pvcButtonHandler.js';
import { handlePvcSelect } from './_pvcSelectHandler.js';
import { handlePvcVoiceStateUpdate } from './_pvcGatekeeper.js';
import { startPvcScheduler, stopPvcScheduler } from './pvcScheduler.js';
import { getSessionByOwner, setUserLimit } from './pvcService.js';
let schedulerTimer = null;
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
        if (!guildId)
            return;
        const session = await getSessionByOwner(guildId, userId);
        if (!session) {
            await interaction.reply({ content: "You don't have an active PVC.", ephemeral: true });
            return;
        }
        const channel = interaction.guild?.channels.cache.get(session.channelId);
        if (interaction.customId === 'pvc_modal_rename') {
            const newName = interaction.fields.getTextInputValue('name');
            if (channel && channel.isVoiceBased()) {
                await channel.setName(newName);
            }
            await interaction.reply({ content: `PVC renamed to **${newName}**.`, ephemeral: true });
        }
        else if (interaction.customId === 'pvc_modal_limit') {
            const limitStr = interaction.fields.getTextInputValue('limit');
            const limit = parseInt(limitStr, 10);
            if (isNaN(limit) || limit < 0 || limit > 99) {
                await interaction.reply({ content: 'Invalid limit. Must be between 0 and 99.', ephemeral: true });
                return;
            }
            await setUserLimit(session.channelId, limit);
            if (channel && channel.isVoiceBased()) {
                await channel.setUserLimit(limit);
            }
            await interaction.reply({ content: `PVC user limit set to ${limit === 0 ? 'unlimited' : limit}.`, ephemeral: true });
        }
    },
    onVoiceStateUpdate: async (oldState, newState) => {
        await handlePvcVoiceStateUpdate(oldState, newState);
    },
    onReady: async (client) => {
        schedulerTimer = startPvcScheduler(client);
    },
    onShutdown: async () => {
        if (schedulerTimer) {
            stopPvcScheduler(schedulerTimer);
        }
    }
};
//# sourceMappingURL=_module.js.map