import type { ButtonInteraction, ModalSubmitInteraction, MessageReaction, User, PartialMessageReaction, PartialUser, Message, Client } from 'discord.js';
export declare function registerSuggestionPanelChannel(channelId: string): void;
export declare function handleSuggestionButton(interaction: ButtonInteraction): Promise<void>;
export declare function handleSuggestionModal(interaction: ModalSubmitInteraction): Promise<void>;
export declare function handleSuggestionReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void>;
export declare function handleSuggestionReactionRemove(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void>;
export declare function handleSuggestionPanelResurface(_message: Message): Promise<void>;
export declare function initializeSuggestionPanels(client: Client): Promise<void>;
//# sourceMappingURL=_suggestionHandler.d.ts.map