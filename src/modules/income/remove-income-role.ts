import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { removeIncomeRole } from './incomeService.js';

export default defineCommand({
  name: 'remove-income-role',
  aliases: ['remincrole'],
  module: 'income',
  description: 'Remove an income-providing role',
  usage: 'remove-income-role <@role>',
  examples: ['remove-income-role @VIP'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 1) {
      await ctx.respond.error('Invalid arguments. Usage: `remove-income-role <@role>`');
      return;
    }

    const result = resolveRole(ctx.parsed.args[0], ctx.guild);
    if (!result.success) { await ctx.respond.error(result.error || 'Could not find that role'); return; }
    const roleId = result.value.id;

    await removeIncomeRole(ctx.guild!.id, roleId);
    await ctx.respond.success(`Successfully removed income configuration for role <@&${roleId}>.`);
  },
});
