import { type ButtonInteraction, type Client } from 'discord.js';
import { type ComponentV2Payload } from '../../core/ui/index.js';
export interface PingData {
    wsLatency: number;
    roundtripLatency: number;
    dbLatency: number;
    restLatency: number;
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    guildCount: number;
    shardId: number;
    nodeVersion: string;
}
export declare function measurePing(client: Client, messageTimestamp?: number): Promise<PingData>;
export declare function buildPingV2Embed(data: PingData, userId: string): ComponentV2Payload;
export declare function handlePingRefresh(interaction: ButtonInteraction): Promise<void>;
//# sourceMappingURL=pingUI.d.ts.map