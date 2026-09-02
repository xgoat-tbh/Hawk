import type { User, GuildMember, Role, GuildBasedChannel, CategoryChannel } from 'discord.js';
export interface ResolvedUser {
    id: string;
    username: string;
    displayName: string;
    tag: string;
    member: GuildMember | null;
    user: User;
}
export interface ResolvedRole {
    id: string;
    name: string;
    role: Role;
}
export interface ResolvedChannel {
    id: string;
    name: string;
    channel: GuildBasedChannel;
}
export interface ResolvedCategory {
    id: string;
    name: string;
    category: CategoryChannel;
}
export type ResolutionResult<T> = {
    success: true;
    value: T;
} | {
    success: false;
    error: string;
};
//# sourceMappingURL=resolver.d.ts.map