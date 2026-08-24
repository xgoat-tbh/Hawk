import type { Guild, GuildMember, Role } from 'discord.js';
export declare function canExecutorManage(guild: Guild, executor: GuildMember, targetRole?: Role, targetMember?: GuildMember): boolean;
export declare function isRoleManageable(guild: Guild, role: Role, executor?: GuildMember): boolean;
export declare function isMemberManageable(guild: Guild, member: GuildMember, executor?: GuildMember): boolean;
export declare function toggleRoleForMember(guild: Guild, member: GuildMember, role: Role, executor?: GuildMember): Promise<'added' | 'removed' | 'skipped'>;
export declare function addRoleToMember(guild: Guild, member: GuildMember, role: Role, executor?: GuildMember): Promise<'added' | 'skipped'>;
export declare function removeRoleFromMember(guild: Guild, member: GuildMember, role: Role, executor?: GuildMember): Promise<'removed' | 'skipped'>;
//# sourceMappingURL=roleHelpers.d.ts.map