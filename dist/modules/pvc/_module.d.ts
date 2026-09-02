import type { Client } from 'discord.js';
declare const _default: {
    name: string;
    description: string;
    buttonPrefixes: string[];
    selectPrefixes: string[];
    modalPrefixes: string[];
    onButton: (interaction: import("discord.js").ButtonInteraction<import("discord.js").CacheType>) => Promise<void>;
    onSelect: (interaction: import("discord.js").AnySelectMenuInteraction) => Promise<void>;
    onModal: (interaction: import("discord.js").ModalSubmitInteraction<import("discord.js").CacheType>) => Promise<void>;
    onVoiceStateUpdate: (oldState: import("discord.js").VoiceState, newState: import("discord.js").VoiceState) => Promise<void>;
    onReady: (client: Client) => Promise<void>;
    onShutdown: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=_module.d.ts.map