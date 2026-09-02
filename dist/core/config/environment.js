import 'dotenv/config';
function required(key) {
    const value = process.env[key]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function optional(key, fallback) {
    return process.env[key]?.trim() || fallback;
}
export const env = {
    botToken: required('BOT_TOKEN'),
    databaseUrl: required('DATABASE_URL'),
    devWebhookUrl: optional('DEV_WEBHOOK_URL', ''),
    mainGuildId: required('MAIN_GUILD_ID'),
    testGuildId: optional('TEST_GUILD_ID', process.env.MAIN_GUILD_ID?.trim() || ''),
    emojiGuildId: optional('EMOJI_GUILD_ID', ''),
    botOwnerId: required('BOT_OWNER_ID').split(',')[0].trim(),
    botOwnerIds: required('BOT_OWNER_ID').split(',').map(id => id.trim()).filter(Boolean),
    botAdminIds: optional('BOT_ADMIN_IDS', '').split(',').map(id => id.trim()).filter(Boolean),
    nodeEnv: optional('NODE_ENV', 'development'),
    enabledModules: process.env.ENABLED_MODULES ? process.env.ENABLED_MODULES.split(',').map(m => m.trim()).filter(Boolean) : undefined,
};
export function isDev() {
    return env.nodeEnv === 'development';
}
export function isProd() {
    return env.nodeEnv === 'production';
}
//# sourceMappingURL=environment.js.map