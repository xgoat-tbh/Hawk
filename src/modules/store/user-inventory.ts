import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getInventory } from './storeService.js';
import { buildInventoryEmbed } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'user-inventory',
  aliases: ['userinv'],
  module: 'store',
  description: 'Shows another user\'s inventory',
  usage: 'user-inventory <@user>',
  examples: ['user-inventory @user'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const target = ctx.message.mentions.users.first();
    if (!target) {
      await ctx.respond.error('Please mention a user.');
      return;
    }

    const entries = await getInventory(ctx.guild.id, target.id);
    const config = await getEconomyConfig(ctx.guild.id);
    const currency = config?.currencySymbol || '$';

    const embed = buildInventoryEmbed(entries, target.username, currency);
    await ctx.respond.raw({ embeds: [embed] });
  },
});

