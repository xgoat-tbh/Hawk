import type { Message } from 'discord.js';
import type { SuggestionRecord } from '../../types/suggestion.js';
import { type ComponentV2Payload } from '../../core/ui/index.js';
export declare function buildSuggestionPayload(suggestion: SuggestionRecord, authorTag?: string, reason?: string): ComponentV2Payload;
export declare function buildSuggestionPanelPayload(): ComponentV2Payload;
export declare function resolveSuggestionTarget(input: string, guildId: string, message?: Message): Promise<SuggestionRecord | null>;
//# sourceMappingURL=suggestionUI.d.ts.map