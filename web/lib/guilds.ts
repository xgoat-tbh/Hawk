export const MAIN_GUILD_ID = process.env.MAIN_GUILD_ID || '1517584175677308998';
export const TEST_GUILD_ID = process.env.TEST_GUILD_ID || '1493322410567401722';
export const supportedGuildIds = [MAIN_GUILD_ID, TEST_GUILD_ID];
export function guildLabel(id: string) { return id === TEST_GUILD_ID ? 'Yolo (Test)' : 'Main Server'; }
