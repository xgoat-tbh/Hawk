import { env, isDev } from './environment.js';
export const guilds = {
    get primary() {
        return isDev() ? env.testGuildId : env.mainGuildId;
    },
    main: env.mainGuildId,
    test: env.testGuildId,
    emoji: env.emojiGuildId || env.mainGuildId,
};
//# sourceMappingURL=guilds.js.map