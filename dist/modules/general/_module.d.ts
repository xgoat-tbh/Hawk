import type { ButtonInteraction } from 'discord.js';
import { handleHelpSelect } from './_helpHandler.js';
import { handleStealModal } from './_stealHandler.js';
import { handleAfkMessage } from './_afkHandler.js';
declare const _default: {
    name: string;
    description: string;
    buttonPrefixes: string[];
    selectPrefixes: string[];
    modalPrefixes: string[];
    onButton: (interaction: ButtonInteraction) => Promise<void>;
    onSelect: typeof handleHelpSelect;
    onModal: typeof handleStealModal;
    onMessage: typeof handleAfkMessage;
};
export default _default;
//# sourceMappingURL=_module.d.ts.map