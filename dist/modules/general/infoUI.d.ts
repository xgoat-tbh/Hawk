import { type ButtonInteraction, type Client, type Guild } from 'discord.js';
import { type ComponentV2Payload } from '../../core/ui/index.js';
export declare function buildInfoV2Embed(client: Client, _guild: Guild, prefix: string, userId: string): Promise<ComponentV2Payload>;
export declare function handleInfoInteraction(interaction: ButtonInteraction): Promise<void>;
//# sourceMappingURL=infoUI.d.ts.map