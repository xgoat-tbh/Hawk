import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { deductCash } from '../economy/economyService.js';
import { getGameCooldown } from '../../core/database/repositories/gameCooldownRepo.js';
import {
  type MinesSession,
  registerMinesSession,
  getStartingMultiplier,
  renderMinesGrid,
} from './_minesHandler.js';

// Cooldown tracker per guild:user
const userGameCooldowns = new Map<string, number>();

export default defineCommand({
  name: 'mines',
  module: 'games',
  description: 'Play Mines on a 3x3 grid with customizable mine count and dynamic multipliers.',
  usage: 'mines <amount> [mine amount]',
  examples: ['mines 500', 'mines 1000 5', 'mines 250 1'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 0,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, member, parsed, respond, channel } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}mines <amount> [mine amount]\``);
      return;
    }

    const betAmount = parseInt(parsed.args[0], 10);
    if (isNaN(betAmount) || betAmount <= 0) {
      await respond.error('Please enter a valid bet amount greater than 0.');
      return;
    }

    let mineCount = 3;
    if (parsed.args[1]) {
      const parsedMines = parseInt(parsed.args[1], 10);
      if (isNaN(parsedMines) || parsedMines < 1 || parsedMines > 8) {
        await respond.error('Mine amount must be between 1 and 8.');
        return;
      }
      mineCount = parsedMines;
    }

    // Cooldown check (default 15s)
    const cooldownSecs = await getGameCooldown(guild.id, 'mines');
    const cooldownKey = `${guild.id}:${member.id}:mines`;
    const lastPlayed = userGameCooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    const elapsed = Math.floor((now - lastPlayed) / 1000);

    if (elapsed < cooldownSecs) {
      await respond.warning(`Please wait **${cooldownSecs - elapsed}s** before starting another Mines game.`);
      return;
    }

    // Deduct bet amount
    try {
      await deductCash(guild.id, member.id, betAmount);
    } catch (err: any) {
      await respond.error(err.message || 'Insufficient wallet balance to place this bet.');
      return;
    }

    userGameCooldowns.set(cooldownKey, now);

    // Randomize mine positions across 0..8
    const minePositions = new Set<number>();
    while (minePositions.size < mineCount) {
      const pos = Math.floor(Math.random() * 9);
      minePositions.add(pos);
    }

    const gameId = `${guild.id}_${member.id}_${Date.now()}`;
    const startMultiplier = getStartingMultiplier(mineCount);

    const session: MinesSession = {
      gameId,
      guildId: guild.id,
      userId: member.id,
      betAmount,
      mineCount,
      minePositions,
      revealedGems: new Set<number>(),
      currentMultiplier: startMultiplier,
      active: true,
      timeoutTimer: null as any,
    };

    // 5-minute inactivity timeout
    session.timeoutTimer = setTimeout(async () => {
      if (session.active) {
        session.active = false;
        // Auto cash out if any gems revealed
      }
    }, 300_000);

    registerMinesSession(session);

    const rows = renderMinesGrid(session, false);
    await channel.send({
      content: `💣 **Mines** | <@${member.id}> bet **$${betAmount.toLocaleString()}** with **${mineCount}** mine(s).\nPick a tile to find gems (💎)! Next multiplier: **${startMultiplier.toFixed(2)}x**`,
      components: rows,
    });
  },
});
