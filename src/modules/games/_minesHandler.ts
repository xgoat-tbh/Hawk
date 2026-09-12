import type { ButtonInteraction } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { addCash } from '../economy/economyService.js';
import { logTransaction } from '../../core/database/repositories/transactionRepo.js';

export interface MinesSession {
  gameId: string;
  guildId: string;
  userId: string;
  betAmount: number;
  mineCount: number;
  minePositions: Set<number>;
  revealedGems: Set<number>;
  currentMultiplier: number;
  active: boolean;
  timeoutTimer: NodeJS.Timeout;
}

const activeMinesGames = new Map<string, MinesSession>();

// Multiplier table base for 3x3 (total 9 tiles)
const MULTIPLIERS = [1.06, 1.21, 1.41, 1.69, 2.11, 2.82, 4.23, 8.46];

export function getMinesSession(gameId: string): MinesSession | undefined {
  return activeMinesGames.get(gameId);
}

export function registerMinesSession(session: MinesSession): void {
  activeMinesGames.set(session.gameId, session);
}

export function getStartingMultiplier(mineCount: number): number {
  if (mineCount <= 1) return 1.06;
  if (mineCount === 2) return 1.21;
  if (mineCount === 3) return 1.41;
  if (mineCount === 4) return 1.69;
  if (mineCount === 5) return 2.11;
  if (mineCount === 6) return 2.82;
  if (mineCount === 7) return 4.23;
  return 8.46;
}

export function calculateNextMultiplier(mineCount: number, revealedCount: number): number {
  const safeTiles = 9 - mineCount;
  if (revealedCount >= safeTiles) return 8.46;
  const index = Math.min(revealedCount, MULTIPLIERS.length - 1);
  return MULTIPLIERS[index];
}

export function renderMinesGrid(session: MinesSession, gameOver: boolean = false, hitBombIndex?: number): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const btn = new ButtonBuilder().setCustomId(`mines:tile:${session.gameId}:${idx}`);

      if (session.revealedGems.has(idx)) {
        btn.setLabel('💎').setStyle(ButtonStyle.Success).setDisabled(true);
      } else if (gameOver) {
        if (session.minePositions.has(idx)) {
          if (idx === hitBombIndex) {
            btn.setLabel('💥').setStyle(ButtonStyle.Danger).setDisabled(true);
          } else {
            btn.setLabel('💣').setStyle(ButtonStyle.Secondary).setDisabled(true);
          }
        } else {
          btn.setLabel('💎').setStyle(ButtonStyle.Secondary).setDisabled(true);
        }
      } else {
        btn.setLabel('❓').setStyle(ButtonStyle.Primary).setDisabled(false);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }

  // 4th row: Cash Out button
  const currentPayout = Math.floor(session.betAmount * session.currentMultiplier);
  const cashOutBtn = new ButtonBuilder()
    .setCustomId(`mines:cashout:${session.gameId}`)
    .setLabel(session.revealedGems.size > 0 ? `Cash Out ($${currentPayout.toLocaleString()})` : 'Cash Out')
    .setStyle(ButtonStyle.Success)
    .setDisabled(gameOver || session.revealedGems.size === 0);

  const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cashOutBtn);
  rows.push(controlRow);

  return rows;
}

export async function handleMinesButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('mines:')) return;

  const parts = customId.split(':');
  const action = parts[1]; // 'tile' or 'cashout'
  const gameId = parts[2];
  const tileIndex = parts[3] !== undefined ? parseInt(parts[3], 10) : undefined;

  const session = activeMinesGames.get(gameId);
  if (!session || !session.active) {
    await interaction.reply({
      content: 'This Mines session has ended or expired.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.user.id !== session.userId) {
    await interaction.reply({
      content: 'Only the game initiator can click these buttons.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Reset 5-minute inactivity timer
  clearTimeout(session.timeoutTimer);
  session.timeoutTimer = setTimeout(async () => {
    if (session.active) {
      session.active = false;
      activeMinesGames.delete(gameId);
      const payout = Math.floor(session.betAmount * session.currentMultiplier);
      if (session.revealedGems.size > 0 && payout > 0) {
        await addCash(session.guildId, session.userId, payout).catch(() => {});
        await logTransaction(
          session.guildId,
          session.userId,
          'mines',
          payout,
          'games',
          null,
          `Mines auto-cashout after 5m timeout ($${payout})`,
        ).catch(() => {});
      }
    }
  }, 300_000);

  // Handle Cash Out
  if (action === 'cashout') {
    session.active = false;
    clearTimeout(session.timeoutTimer);
    activeMinesGames.delete(gameId);

    const payout = Math.floor(session.betAmount * session.currentMultiplier);
    await addCash(session.guildId, session.userId, payout);

    await logTransaction(
      session.guildId,
      session.userId,
      'mines',
      payout,
      'games',
      null,
      `Mines Cashed Out ($${payout} at ${session.currentMultiplier.toFixed(2)}x)`,
    ).catch(() => {});

    const rows = renderMinesGrid(session, true);
    await interaction.update({
      content: `🎉 **Cashed Out!** <@${session.userId}> won **$${payout.toLocaleString()}** (${session.currentMultiplier.toFixed(2)}x)!`,
      components: rows,
    });
    return;
  }

  // Handle Tile Click
  if (action === 'tile' && tileIndex !== undefined) {
    if (session.revealedGems.has(tileIndex)) {
      await interaction.deferUpdate();
      return;
    }

    // Check Bomb Hit
    if (session.minePositions.has(tileIndex)) {
      session.active = false;
      clearTimeout(session.timeoutTimer);
      activeMinesGames.delete(gameId);

      await logTransaction(
        session.guildId,
        session.userId,
        'mines',
        -session.betAmount,
        'games',
        null,
        `Mines loss: hit bomb at tile ${tileIndex + 1}`,
      ).catch(() => {});

      const rows = renderMinesGrid(session, true, tileIndex);
      await interaction.update({
        content: `💥 **BOOM!** <@${session.userId}> stepped on a mine! Lost **$${session.betAmount.toLocaleString()}**!`,
        components: rows,
      });
      return;
    }

    // Safe Gem Revealed
    session.revealedGems.add(tileIndex);
    session.currentMultiplier = calculateNextMultiplier(session.mineCount, session.revealedGems.size);

    const safeTilesTotal = 9 - session.mineCount;
    // Check All Safe Tiles Cleared -> Automatic Win
    if (session.revealedGems.size >= safeTilesTotal) {
      session.active = false;
      clearTimeout(session.timeoutTimer);
      activeMinesGames.delete(gameId);

      const payout = Math.floor(session.betAmount * session.currentMultiplier);
      await addCash(session.guildId, session.userId, payout);

      await logTransaction(
        session.guildId,
        session.userId,
        'mines',
        payout,
        'games',
        null,
        `Mines All Clear ($${payout} at ${session.currentMultiplier.toFixed(2)}x)`,
      ).catch(() => {});

      const rows = renderMinesGrid(session, true);
      await interaction.update({
        content: `🏆 **PERFECT CLEAR!** <@${session.userId}> cleared all safe tiles and won **$${payout.toLocaleString()}** (${session.currentMultiplier.toFixed(2)}x)!`,
        components: rows,
      });
      return;
    }

    const currentPayout = Math.floor(session.betAmount * session.currentMultiplier);
    const rows = renderMinesGrid(session, false);
    await interaction.update({
      content: `💎 Safe! Multiplier: **${session.currentMultiplier.toFixed(2)}x** | Current payout: **$${currentPayout.toLocaleString()}**`,
      components: rows,
    });
  }
}
