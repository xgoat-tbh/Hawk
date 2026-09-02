import { type Client } from 'discord.js';
import type { PvcSession, PvcAccessEntry } from './pvcService.js';
export declare function buildPvcInfoPayload(session: PvcSession, ownerName: string, accessList: PvcAccessEntry[], client: Client): {
    components: any[];
    flags?: any;
};
export declare function buildPvcInfoEmbed(session: PvcSession, ownerName: string, accessList: PvcAccessEntry[], client: Client): {
    embeds: any[];
    components: any[];
    flags?: any;
};
//# sourceMappingURL=pvcInfoUI.d.ts.map