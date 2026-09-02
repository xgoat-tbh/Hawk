import type { Interaction } from 'discord.js';
export declare function buildCustomId(prefix: string, action: string, ownerId?: string, extra?: string): string;
export declare function parseCustomId(customId: string): {
    prefix: string;
    action: string;
    ownerId?: string;
    extra?: string;
};
export declare function isInteractionOwner(interaction: Interaction, ownerId?: string): boolean;
//# sourceMappingURL=customId.d.ts.map