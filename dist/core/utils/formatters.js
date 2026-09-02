export function formatUser(target, guild) {
    if (!target)
        return '**Unknown**';
    if (typeof target === 'string') {
        // Check guild member cache first
        const member = guild?.members.cache.get(target);
        if (member)
            return `**${member.displayName}**`;
        // Check client user cache
        const client = guild?.client ?? globalThis.hawkClient;
        const user = client?.users?.cache.get(target);
        if (user)
            return `**${user.displayName || user.globalName || user.username}**`;
        return `**${target}**`;
    }
    if ('displayName' in target && target.displayName) {
        return `**${target.displayName}**`;
    }
    if ('username' in target) {
        const user = target;
        return `**${user.displayName || user.globalName || user.username}**`;
    }
    return `**User**`;
}
export function mentionUser(target, guild) {
    return formatUser(target, guild);
}
export function formatRole(target, guild) {
    if (!target)
        return '`Unknown`';
    if (typeof target === 'string') {
        if (guild && (target === guild.id || target === 'everyone')) {
            return '`everyone`';
        }
        const role = guild?.roles.cache.get(target);
        if (role)
            return `\`${role.name}\``;
        const client = guild?.client ?? globalThis.hawkClient;
        if (client) {
            for (const g of client.guilds.cache.values()) {
                const r = g.roles.cache.get(target);
                if (r)
                    return `\`${r.name}\``;
            }
        }
        return `\`${target}\``;
    }
    return `\`${target.name}\``;
}
export function mentionRole(target, guild) {
    return formatRole(target, guild);
}
export function mentionChannel(id) {
    return `<#${id}>`;
}
export function timestamp(date, style = 'R') {
    const seconds = Math.floor(date.getTime() / 1000);
    return `<t:${seconds}:${style}>`;
}
export function codeBlock(text, language = '') {
    return `\`\`\`${language}\n${text}\n\`\`\``;
}
export function inlineCode(text) {
    return `\`${text}\``;
}
export function bold(text) {
    return `**${text}**`;
}
//# sourceMappingURL=formatters.js.map