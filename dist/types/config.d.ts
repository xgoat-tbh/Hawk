export interface EnvironmentConfig {
    botToken: string;
    databaseUrl: string;
    devWebhookUrl: string;
    mainGuildId: string;
    testGuildId: string;
    emojiGuildId: string;
    botOwnerId: string;
    botOwnerIds: string[];
    botAdminIds: string[];
    nodeEnv: 'development' | 'production';
    enabledModules?: string[];
}
export interface GuildConfig {
    guildId: string;
    prefix: string;
    logChannelId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface BrandingConfig {
    footerText: string;
    defaultColor: number;
    emojis: EmojiConfig;
}
export interface EmojiConfig {
    success: string;
    error: string;
    warning: string;
    info: string;
    loading: string;
    denied: string;
    upvote: string;
    downvote: string;
    accepted: string;
    considered: string;
    voice: string;
    gaming: string;
    suggestion: string;
    confession: string;
    sticky: string;
    moderation: string;
    welcome: string;
    media: string;
    general: string;
    owner: string;
    currency: string;
    cash: string;
    bank: string;
    leaderboard: string;
    casino: string;
    dice: string;
    cards: string;
    slots: string;
    cockfight: string;
    roulette: string;
    store: string;
    inventory: string;
    pvc: string;
    fastag: string;
    lock: string;
    unlock: string;
    hide: string;
    delete: string;
    transfer: string;
    rename: string;
    limit: string;
    economy: string;
    income: string;
    [key: string]: string;
}
export interface ModuleDefinition {
    name: string;
    description: string;
    enabled: boolean;
}
//# sourceMappingURL=config.d.ts.map