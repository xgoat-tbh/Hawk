import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { addIncomeRole } from './incomeService.js';

export default defineCommand({
  name: 'add-income-role',
  aliases: ['addincrole'],
  module: 'income',
  description: 'Add a new income-providing role',
  usage: 'add-income-role <@role> <amount>',
  examples: ['add-income-role @VIP 5000'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 2) {
      await ctx.respond.error('Invalid arguments. Usage: `add-income-role <@role> <amount>`');
      return;
    }

    const roleMatch = ctx.parsed.args[0].match(/<@&(\d+)>/);
    if (!roleMatch) {
      await ctx.respond.error('Invalid role mention. Usage: `add-income-role <@role> <amount>`');
      return;
    }

    const roleId = roleMatch[1];
    const amount = parseInt(ctx.parsed.args[1], 10);

    if (isNaN(amount) || amount <= 0) {
      await ctx.respond.error('Amount must be a positive number.');
      return;
    }

    await addIncomeRole(ctx.guild!.id, roleId, amount);
    await ctx.respond.success(`Successfully added/updated income for role <@&${roleId}> to **${amount}**.`);
  },
});
