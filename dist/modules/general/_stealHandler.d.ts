import type { ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
export interface StealStateData {
    mediaUrl: string;
    defaultName: string;
    invokerId: string;
    guildId: string;
}
export declare function handleStealButton(interaction: ButtonInteraction): Promise<void>;
export declare function handleStealModal(interaction: ModalSubmitInteraction): Promise<void>;
//# sourceMappingURL=_stealHandler.d.ts.map