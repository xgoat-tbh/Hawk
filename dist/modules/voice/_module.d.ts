import type { ButtonInteraction } from 'discord.js';
import { handleVConfigFallback } from './vconfig.js';
import { handleFmvVoiceStateUpdate } from './FmvManager.js';
declare const _default: {
    name: string;
    description: string;
    buttonPrefixes: string[];
    channelSelectPrefixes: string[];
    onButton: (interaction: ButtonInteraction) => Promise<void>;
    onChannelSelect: typeof handleVConfigFallback;
    onVoiceStateUpdate: typeof handleFmvVoiceStateUpdate;
};
export default _default;
//# sourceMappingURL=_module.d.ts.map