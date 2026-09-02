import type { Guild, VoiceBasedChannel } from 'discord.js';
import type { ResolutionResult } from '../../types/resolver.js';
export interface ResolvedVoiceChannel {
    id: string;
    name: string;
    channel: VoiceBasedChannel;
}
/**
 * Resolves a voice/stage channel from user input.
 *
 * Resolution order:
 *  0. Channel mention (<#ID>)
 *  1. Exact snowflake ID
 *  2-6. Layered matcher: exact name → starts-with → word-prefix → word-contains → normalized → fuzzy
 *
 * Only considers GuildVoice and GuildStageVoice channels.
 */
export declare function resolveVoiceChannel(input: string, guild: Guild): ResolutionResult<ResolvedVoiceChannel>;
//# sourceMappingURL=VoiceChannelResolver.d.ts.map