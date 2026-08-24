import type { ButtonInteraction, ModalSubmitInteraction, Message, Client } from 'discord.js';
export declare function registerConfessionPanelChannel(channelId: string): void;
export declare function handleConfessionButton(interaction: ButtonInteraction): Promise<void>;
export declare function handleConfessionModal(interaction: ModalSubmitInteraction): Promise<void>;
export declare function handleConfessionPanelResurface(_message: Message): Promise<void>;
export declare function initializeConfessionPanels(client: Client): Promise<void>;
//# sourceMappingURL=_confessionHandler.d.ts.map