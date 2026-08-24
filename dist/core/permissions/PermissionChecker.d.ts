import type { GuildMember, PermissionResolvable, GuildTextBasedChannel } from 'discord.js';
import type { CommandDefinition } from '../../types/command.js';
import type { PermissionCheckResult, PermissionContext } from '../../types/permission.js';
import { AuthorityLevel } from '../../types/permission.js';
export declare function getAuthorityLevel(userId: string, _guildOwnerId?: string): AuthorityLevel;
export declare function checkPermission(command: CommandDefinition, ctx: PermissionContext, _member?: GuildMember): Promise<PermissionCheckResult>;
export declare function checkBotPermissions(botMember: GuildMember, required: PermissionResolvable[]): {
    hasAll: boolean;
    missing: string[];
};
export declare function getUsableCommandsForMember(member: GuildMember, channel: GuildTextBasedChannel): Promise<{
    allCommands: CommandDefinition[];
    usableCommands: CommandDefinition[];
    usableSet: Set<string>;
    totalCount: number;
    usableCount: number;
}>;
//# sourceMappingURL=PermissionChecker.d.ts.map