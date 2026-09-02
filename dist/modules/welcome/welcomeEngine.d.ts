import type { Guild, GuildMember, User, BaseMessageOptions } from 'discord.js';
import type { VariableContext } from '../../types/welcome.js';
export declare function buildVariableContext(guild: Guild, userOrMember: User | GuildMember): VariableContext;
export declare function substituteVariables(text: string, ctx: VariableContext): string;
export declare function renderWelcomePayload(rawPayload: string, ctx: VariableContext): BaseMessageOptions;
export declare const WELCOME_VARIABLES_GUIDE: string;
//# sourceMappingURL=welcomeEngine.d.ts.map