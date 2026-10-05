import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { deductCash, addCash } from '../economy/economyService.js';
import { logTransaction } from '../../core/database/repositories/transactionRepo.js';
import { getGameSettings } from '../../core/database/repositories/gameCooldownRepo.js';
import { validGameBet } from '../../core/utils/gameBet.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

// Cooldown tracker per guild:user:coinflip
const userCoinflipCooldowns = new Map<string, number>();

export default defineCommand({
  name: 'coinflip',
  aliases: ['cf'],
  module: 'games',
  description: 'Flip a coin with a 2x multiplier payout.',
  usage: 'coinflip <amount> [h | t]',
  examples: ['coinflip 500', 'coinflip 1000 t', 'cf 250 h'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 0,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, member, parsed, respond, channel } = ctx;
    const settings = await getGameSettings(guild.id, 'coinflip');
    if (!settings.enabled) { await respond.denied('Coinflip is disabled in this server.'); return; }
    const config = await getEconomyConfig(guild.id);

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}coinflip <amount> [h | t]\``);
      return;
    }

    // Support scientific notation or standard integer
    const rawAmount = parsed.args[0].toLowerCase();
    let betAmount: number;
    if (rawAmount.includes('e')) {
      betAmount = Math.floor(Number(rawAmount));
    } else {
      betAmount = parseInt(rawAmount, 10);
    }

    if (!validGameBet(betAmount, config.minBet, config.maxBet)) {
      await respond.error(`Enter a whole bet between ${config.minBet} and ${config.maxBet}.`);
      return;
    }

    let chosenSide = 'h';
    if (parsed.args[1]) {
      const sideInput = parsed.args[1].toLowerCase();
      if (['h', 'head', 'heads'].includes(sideInput)) {
        chosenSide = 'h';
      } else if (['t', 'tail', 'tails'].includes(sideInput)) {
        chosenSide = 't';
      } else {
        await respond.error('Invalid side choice! Use `h` (heads) or `t` (tails).');
        return;
      }
    }

    // Cooldown check (default 15s)
    const cooldownSecs = settings.cooldown;
    const cooldownKey = `${guild.id}:${member.id}:coinflip`;
    const lastPlayed = userCoinflipCooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    const elapsed = Math.floor((now - lastPlayed) / 1000);

    if (elapsed < cooldownSecs) {
      await respond.warning(`Please wait **${cooldownSecs - elapsed}s** before flipping another coin.`);
      return;
    }

    // Deduct bet amount
    try {
      await deductCash(guild.id, member.id, betAmount);
    } catch (err: any) {
      await respond.error(err.message || 'Insufficient wallet balance to place this bet.');
      return;
    }

    userCoinflipCooldowns.set(cooldownKey, now);

    const sym = config?.currencySymbol || '$';

    // Phase 1: Spinning coin placeholder animation
    const spinMsg = await channel.send({
      content: `🪙 <@${member.id}> flipped a coin betting **${sym}${betAmount.toLocaleString()}** on **${chosenSide === 'h' ? 'Heads' : 'Tails'}**...\n*The coin is spinning in the air...*`,
    });

    // Wait 1.5s for dramatic effect
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Phase 2: Outcome calculation
    const isHeads = Math.random() < 0.5;
    const outcomeSide = isHeads ? 'h' : 't';
    const outcomeName = isHeads ? 'Heads' : 'Tails';
    const won = chosenSide === outcomeSide;

    if (won) {
      const payout = betAmount * 2;
      await addCash(guild.id, member.id, payout);
      await logTransaction(
        guild.id,
        member.id,
        'coinflip',
        payout,
        'games',
        null,
        `Coinflip win (${outcomeName}) payout: ${sym}${payout}`,
      ).catch(() => {});

      await spinMsg.edit({
        content: `🪙 **Coinflip** | Outcome: **${outcomeName}**!\n🎉 Congratulations <@${member.id}>! You won **${sym}${payout.toLocaleString()}** (2x)!`,
      });
    } else {
      await logTransaction(
        guild.id,
        member.id,
        'coinflip',
        -betAmount,
        'games',
        null,
        `Coinflip loss (${outcomeName}) bet: ${sym}${betAmount}`,
      ).catch(() => {});

      await spinMsg.edit({
        content: `🪙 **Coinflip** | Outcome: **${outcomeName}**!\n😢 Unlucky <@${member.id}>, you lost **${sym}${betAmount.toLocaleString()}**. Better luck next time!`,
      });
    }
  },
});
