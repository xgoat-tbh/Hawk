import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { env } from '../../core/config/environment.js';
import { grantDashboardAccess, revokeDashboardAccess, listDashboardAccess } from '../../core/database/repositories/dashboardAccessRepo.js';
import { ui } from '../../core/ui/index.js';
import type { GuildTextBasedChannel } from 'discord.js';

export const accessCommand = defineCommand({
  name: 'access',
  module: 'general',
  description: 'Manage private web dashboard access permissions for users.',
  usage: 'access <@user/userId> dashboard | access revoke <@user/userId> dashboard | access list',
  aliases: ['dashaccess', 'dashboard-access'],
  botAdminOnly: true,
  execute: async (ctx: CommandContext) => {
    const authorId = ctx.message.author.id;
    const isOwner = env.botOwnerIds.includes(authorId);
    const isAdmin = env.botAdminIds.includes(authorId);

    if (!isOwner && !isAdmin) {
      await ctx.respond.error('Only Bot Owners and Bot Administrators can manage dashboard access.');
      return;
    }

    const sub = ctx.parsed.args[0]?.toLowerCase();

    // 1. List Subcommand: !access list
    if (sub === 'list') {
      const entries = await listDashboardAccess();
      if (entries.length === 0) {
        const payload = ui.standard({
          title: 'Private Dashboard Access',
          text: '> *No additional users currently have dashboard access.*',
        });
        await (ctx.channel as GuildTextBasedChannel).send({ components: payload.components, flags: payload.flags as any });
        return;
      }

      const lines = entries.map((e, idx) => {
        return `• **${idx + 1}.** <@${e.userId}> (\`${e.userId}\`) — Granted by <@${e.grantedBy}> <t:${Math.floor(e.grantedAt.getTime() / 1000)}:R>`;
      });

      const payload = ui.standard({
        title: `Dashboard Access List (${entries.length})`,
        text: lines.join('\n'),
      });
      await (ctx.channel as GuildTextBasedChannel).send({ components: payload.components, flags: payload.flags as any });
      return;
    }

    // 2. Revoke Subcommand: !access revoke <user> dashboard or !access remove <user>
    if (sub === 'revoke' || sub === 'remove' || sub === 'delete') {
      const targetArg = ctx.parsed.args[1];
      if (!targetArg) {
        await ctx.respond.error('Please specify the user to revoke.\n• **Usage:** `!access revoke <@user/userId> dashboard`');
        return;
      }

      const targetId = targetArg.replace(/[<@!>]/g, '');
      const revoked = await revokeDashboardAccess(targetId);

      if (revoked) {
        await ctx.respond.success(`Successfully revoked dashboard access from <@${targetId}> (\`${targetId}\`).`);
      } else {
        await ctx.respond.error(`User <@${targetId}> did not have active dashboard access.`);
      }
      return;
    }

    // 3. Grant Subcommand: !access <user> dashboard (or !access add <user> dashboard)
    let targetArg = sub;

    if (sub === 'add' || sub === 'grant') {
      targetArg = ctx.parsed.args[1];
    }

    if (!targetArg) {
      const payload = ui.standard({
        title: 'Private Dashboard Access Command',
        text: '> **Manage who can log into the private Web Dashboard:**\n\n' +
              '• `!access <user> dashboard` — Grant a user access to the dashboard\n' +
              '• `!access revoke <user> dashboard` — Revoke dashboard access\n' +
              '• `!access list` — View all authorized users',
      });
      await (ctx.channel as GuildTextBasedChannel).send({ components: payload.components, flags: payload.flags as any });
      return;
    }

    const targetId = targetArg.replace(/[<@!>]/g, '');
    if (!/^\d{17,20}$/.test(targetId)) {
      await ctx.respond.error('Please provide a valid Discord mention or Snowflake ID (17-20 digits).');
      return;
    }

    await grantDashboardAccess(targetId, authorId, 'Granted via Discord command');

    await ctx.respond.success(
      `Successfully granted private dashboard access to <@${targetId}> (\`${targetId}\`). They can now log in using their Discord User ID!`
    );
  },
});

export default accessCommand;

