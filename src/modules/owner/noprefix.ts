import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { toggleNoPrefix, setNoPrefix } from '../../core/config/NoPrefixConfig.js';
import { mentionUser } from '../../core/utils/formatters.js';

export default defineCommand({
  name: 'noprefix',
  module: 'owner',
  description: 'Toggle or set no-prefix command execution mode for a user in this server.',
  usage: 'noprefix <user> [on|off]',
  examples: ['noprefix @User', 'noprefix @User on', 'noprefix @User off'],
  ownerOnly: true,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Usage: `?noprefix <user> [on|off]`');
      return;
    }

    const targetArg = parsed.args[0];
    const userResult = await resolveUser(targetArg, guild);
    if (!userResult.success) {
      await respond.error(`User: ${userResult.error}`);
      return;
    }

    const targetUser = userResult.value.user;
    let enabled: boolean;

    if (parsed.args.length >= 2) {
      const modeArg = parsed.args[1].toLowerCase();
      if (modeArg === 'on' || modeArg === 'enable' || modeArg === 'true') {
        enabled = true;
        await setNoPrefix(guild.id, targetUser.id, true);
      } else if (modeArg === 'off' || modeArg === 'disable' || modeArg === 'false') {
        enabled = false;
        await setNoPrefix(guild.id, targetUser.id, false);
      } else {
        await respond.error('Invalid status. Use `on` or `off`.');
        return;
      }
    } else {
      enabled = await toggleNoPrefix(guild.id, targetUser.id);
    }

    if (enabled) {
      await respond.success(`No-prefix mode is now **enabled** for ${mentionUser(targetUser.id)} in this server.`);
    } else {
      await respond.info(`No-prefix mode is now **disabled** for ${mentionUser(targetUser.id)} in this server.`);
    }
  },
});
