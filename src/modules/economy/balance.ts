import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { ensureBalance, getBalance } from './economyService.js';
import { buildBalanceEmbed } from './economyUI.js';

export default defineCommand({
  name: 'balance',
  aliases: ['bal', 'money'],
  module: 'economy',
  description: 'Shows your balance or a mentioned user\'s balance',
  usage: 'balance [@user]',
  examples: ['balance', 'balance @User'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    let target = ctx.member;
    const mentionToken = ctx.parsed.tokens.find(t => t.type === 'mention_user');
    if (mentionToken && mentionToken.value) {
      const member = await ctx.guild.members.fetch(mentionToken.value).catch(() => null);
      if (member) target = member;
    } else if (ctx.replyTarget) {
      target = ctx.replyTarget;
    }

    const config = await getEconomyConfig(ctx.guild.id);
    await ensureBalance(ctx.guild.id, target.id);
    const balance = await getBalance(ctx.guild.id, target.id);
    
    const embed = buildBalanceEmbed(target, balance, config.currencySymbol);
    await ctx.respond.raw({ embeds: [embed] });
  },
});
