export function buildVariableContext(guild, userOrMember) {
    const user = 'user' in userOrMember ? userOrMember.user : userOrMember;
    const membersArray = guild.members?.cache ? Array.from(guild.members.cache.values()) : [];
    const humanMembers = membersArray.filter(m => !m.user?.bot);
    const humanCount = humanMembers.length || Math.max(1, (guild.memberCount ?? 1) - membersArray.filter(m => m.user?.bot).length);
    const eligibleRandomHumans = humanMembers.filter(m => m.id !== user.id);
    let randomUserMention = `<@${user.id}>`;
    if (eligibleRandomHumans.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleRandomHumans.length);
        randomUserMention = `<@${eligibleRandomHumans[randomIndex].id}>`;
    }
    return {
        username: user.username,
        usermention: `<@${user.id}>`,
        usertag: user.tag ?? user.username,
        useravatar: (typeof user.displayAvatarURL === 'function' ? user.displayAvatarURL({ size: 512 }) : null) ?? '',
        servername: guild.name,
        servermember: humanCount,
        serveravatar: (typeof guild.iconURL === 'function' ? guild.iconURL({ size: 512 }) : null) ?? '',
        randomuser: randomUserMention,
    };
}
const VAR_MAP = {
    user: 'usermention',
    username: 'username',
    usermention: 'usermention',
    usertag: 'usertag',
    useravatar: 'useravatar',
    'user.avatar': 'useravatar',
    server: 'servername',
    servername: 'servername',
    'server.name': 'servername',
    servermember: 'servermember',
    servercount: 'servermember',
    'server.count': 'servermember',
    serveravatar: 'serveravatar',
    'server.avatar': 'serveravatar',
    'server.icon': 'serveravatar',
    randomuser: 'randomuser',
};
const VAR_REGEX = /\{(user|username|usermention|usertag|useravatar|user\.avatar|server|servername|server\.name|servermember|servercount|server\.count|serveravatar|server\.avatar|server\.icon|randomuser)\}/gi;
export function substituteVariables(text, ctx) {
    if (!text)
        return text;
    return text.replace(VAR_REGEX, (match, p1) => {
        const key = VAR_MAP[p1.toLowerCase()];
        if (key && ctx[key] !== undefined) {
            return String(ctx[key]);
        }
        return match;
    });
}
const MAX_JSON_PAYLOAD_LENGTH = 20_000;
const MAX_RECURSION_DEPTH = 6;
function processValue(val, ctx, depth = 0) {
    if (depth > MAX_RECURSION_DEPTH)
        return val;
    if (typeof val === 'string') {
        return substituteVariables(val, ctx);
    }
    if (Array.isArray(val)) {
        return val.slice(0, 50).map(item => processValue(item, ctx, depth + 1));
    }
    if (val !== null && typeof val === 'object') {
        const obj = {};
        const entries = Object.entries(val).slice(0, 50);
        for (const [k, v] of entries) {
            obj[k] = processValue(v, ctx, depth + 1);
        }
        return obj;
    }
    return val;
}
export function renderWelcomePayload(rawPayload, ctx) {
    const trimmed = rawPayload.trim();
    // Guard against massive JSON payload abuse
    if (trimmed.length > MAX_JSON_PAYLOAD_LENGTH) {
        const replacedText = substituteVariables(trimmed.slice(0, 2000), ctx);
        return {
            content: replacedText,
            allowedMentions: { parse: [], roles: [], users: [ctx.usermention.replace(/[<@!>]/g, '')].filter(Boolean) },
        };
    }
    // Try parsing as raw JSON payload first
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed);
            const processed = processValue(parsed, ctx);
            let embeds = Array.isArray(processed.embeds) ? processed.embeds : (processed.embed ? [processed.embed] : undefined);
            if (embeds && embeds.length > 10) {
                embeds = embeds.slice(0, 10);
            }
            return {
                content: processed.content ? String(processed.content).slice(0, 2000) : undefined,
                embeds,
                components: Array.isArray(processed.components) ? processed.components.slice(0, 5) : undefined,
                allowedMentions: {
                    parse: [],
                    roles: [],
                    users: [ctx.usermention.replace(/[<@!>]/g, '')].filter(Boolean),
                },
            };
        }
        catch {
            // Fallback to simple text if JSON parsing fails
        }
    }
    // Simple text payload
    const replacedText = substituteVariables(trimmed, ctx);
    return {
        content: replacedText,
        allowedMentions: {
            parse: [],
            roles: [],
            users: [ctx.usermention.replace(/[<@!>]/g, '')].filter(Boolean),
        },
    };
}
export const WELCOME_VARIABLES_GUIDE = '**Available Variables:**\n' +
    '• `{user}` / `{usermention}` — Member mention\n' +
    '• `{username}` / `{usertag}` — Member username\n' +
    '• `{user.avatar}` / `{useravatar}` — Member avatar URL\n' +
    '• `{server}` / `{servername}` / `{server.name}` — Server name\n' +
    '• `{servermember}` / `{server.count}` / `{servercount}` — Human member count\n' +
    '• `{server.icon}` / `{serveravatar}` / `{server.avatar}` — Server icon URL\n' +
    '• `{randomuser}` — Random human member mention';
//# sourceMappingURL=welcomeEngine.js.map