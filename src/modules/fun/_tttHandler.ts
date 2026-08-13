import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type GuildTextBasedChannel,
} from 'discord.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { sanitize } from '../../core/utils/validators.js';

export interface TttGame {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  player1: string; // X (Challenger ID)
  player1Name: string; // Sanitized display name
  player2: string; // O (Opponent ID)
  player2Name: string; // Sanitized display name
  turn: string; // current player ID
  board: (string | null)[]; // 9 cells (0..8)
  status: 'pending' | 'playing' | 'ended';
  winner?: string | 'draw';
  timeoutId?: NodeJS.Timeout;
}

export const activeGames = new Map<string, TttGame>();

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: (string | null)[]): string | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]!;
    }
  }
  if (board.every(cell => cell !== null)) {
    return 'draw';
  }
  return null;
}

export function buildGameBoardPayload(game: TttGame): ComponentV2Payload {
  const isPlaying = game.status === 'playing';
  const turnSymbol = game.turn === game.player1 ? 'X' : 'O';
  const currentTurnName = game.turn === game.player1 ? game.player1Name : game.player2Name;

  let statusText = '';
  if (game.status === 'pending') {
    statusText = `**Tic-Tac-Toe Challenge**\n\n${mentionUser(game.player1)} has challenged ${mentionUser(game.player2)} to a match!\n\n${mentionUser(game.player2)}, do you accept?`;
  } else if (isPlaying) {
    statusText =
      `# Tic-Tac-Toe Match\n\n` +
      `• **Player X:** **${game.player1Name}**\n` +
      `• **Player O:** **${game.player2Name}**\n\n` +
      `**Current Turn:** **${currentTurnName}** (\`${turnSymbol}\`) *(30s turn timer)*`;
  } else if (game.status === 'ended') {
    if (game.winner === 'draw') {
      statusText =
        `# Tic-Tac-Toe Match — Draw!\n\n` +
        `• **Player X:** **${game.player1Name}**\n` +
        `• **Player O:** **${game.player2Name}**\n\n` +
        `**Result:** Match ended in a draw! Well played.`;
    } else if (game.winner) {
      const winnerId = game.winner === 'X' ? game.player1 : game.winner === 'O' ? game.player2 : game.winner;
      const winnerName = winnerId === game.player1 ? game.player1Name : game.player2Name;
      const winningSymbol = winnerId === game.player1 ? 'X' : 'O';
      statusText =
        `# Tic-Tac-Toe Match — Game Over!\n\n` +
        `• **Player X:** **${game.player1Name}**\n` +
        `• **Player O:** **${game.player2Name}**\n\n` +
        `**Winner:** **${winnerName}** (\`${winningSymbol}\`) wins!`;
    }
  }

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  if (game.status === 'pending') {
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ttt_accept_${game.id}`)
        .setLabel('Accept Challenge')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ttt_decline_${game.id}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger),
    );
    rows.push(actionRow);
  } else {
    // 3x3 Grid Buttons
    for (let r = 0; r < 3; r++) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const cell = game.board[idx];
        const btn = new ButtonBuilder().setCustomId(`ttt_move_${game.id}_${idx}`);

        if (cell === 'X') {
          btn.setLabel('X').setStyle(ButtonStyle.Secondary).setDisabled(true);
        } else if (cell === 'O') {
          btn.setLabel('O').setStyle(ButtonStyle.Secondary).setDisabled(true);
        } else {
          btn.setLabel('-').setStyle(ButtonStyle.Secondary).setDisabled(!isPlaying);
        }

        row.addComponents(btn);
      }
      rows.push(row);
    }

    if (isPlaying) {
      const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_surrender_${game.id}`)
          .setLabel('Surrender Match')
          .setStyle(ButtonStyle.Danger),
      );
      rows.push(controlRow);
    }
  }

  return buildV2Container({
    text: statusText,
    components: rows,
  });
}

function resetGameTimeout(game: TttGame, interaction: ButtonInteraction): void {
  if (game.timeoutId) clearTimeout(game.timeoutId);

  game.timeoutId = setTimeout(async () => {
    const active = activeGames.get(game.id);
    if (!active || active.status !== 'playing') return;

    active.status = 'ended';
    // Forfeit: opposite of current turn wins
    const winnerId = active.turn === active.player1 ? active.player2 : active.player1;
    active.winner = winnerId;
    activeGames.delete(active.id);

    try {
      const channel = (await interaction.client.channels.fetch(active.channelId).catch(() => null)) as GuildTextBasedChannel | null;
      if (channel && active.messageId) {
        const msg = await channel.messages.fetch(active.messageId).catch(() => null);
        if (msg) {
          const forfeitPayload = buildGameBoardPayload(active);
          await msg.edit(forfeitPayload).catch(() => {});
        }
      }
    } catch {
      // Ignore channel fetch error
    }
  }, 30_000);
}

export async function handleTttButton(interaction: ButtonInteraction): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('ttt_')) return;

  const parts = customId.split('_'); // ['ttt', action, gameId, ...extra]
  const action = parts[1];
  const gameId = parts[2];

  const game = activeGames.get(gameId);
  if (!game) {
    await interaction.reply({
      content: 'This Tic-Tac-Toe session has expired or concluded.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 1. Challenge Response: Accept or Decline
  if (action === 'accept') {
    if (interaction.user.id !== game.player2) {
      await interaction.reply({
        content: `Only ${mentionUser(game.player2)} can accept this challenge.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.member && 'displayName' in interaction.member) {
      game.player2Name = sanitize((interaction.member as any).displayName || interaction.user.username);
    }
    game.status = 'playing';
    game.messageId = interaction.message.id;
    resetGameTimeout(game, interaction);

    const payload = buildGameBoardPayload(game);
    await interaction.update(payload);
    return;
  }

  if (action === 'decline') {
    if (interaction.user.id !== game.player2 && interaction.user.id !== game.player1) {
      await interaction.reply({
        content: 'Only the invited player or challenger can cancel this challenge.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.timeoutId) clearTimeout(game.timeoutId);
    activeGames.delete(game.id);

    const cancelPayload = buildV2Container({
      text: `**Tic-Tac-Toe Challenge Declined**\n\nThe match challenge was declined by ${mentionUser(interaction.user.id)}.`,
      components: [],
    });
    await interaction.update(cancelPayload);
    return;
  }

  // 2. Surrender
  if (action === 'surrender') {
    if (interaction.user.id !== game.player1 && interaction.user.id !== game.player2) {
      await interaction.reply({
        content: 'You are not a participant in this match.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.status !== 'playing') return;

    if (game.timeoutId) clearTimeout(game.timeoutId);
    game.status = 'ended';
    game.winner = interaction.user.id === game.player1 ? game.player2 : game.player1;
    activeGames.delete(game.id);

    const payload = buildGameBoardPayload(game);
    await interaction.update(payload);
    return;
  }

  // 3. Move
  if (action === 'move') {
    if (game.status !== 'playing') return;

    if (interaction.user.id !== game.player1 && interaction.user.id !== game.player2) {
      await interaction.reply({
        content: 'You are not a player in this match.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.user.id !== game.turn) {
      await interaction.reply({
        content: 'It is not your turn yet. Please wait for your opponent.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const cellIdx = Number.parseInt(parts[3], 10);
    if (Number.isNaN(cellIdx) || cellIdx < 0 || cellIdx > 8 || game.board[cellIdx] !== null) {
      await interaction.reply({
        content: 'Invalid move or cell already occupied.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Place move
    const symbol = game.turn === game.player1 ? 'X' : 'O';
    game.board[cellIdx] = symbol;

    // Check result
    const result = checkWinner(game.board);
    if (result) {
      if (game.timeoutId) clearTimeout(game.timeoutId);
      game.status = 'ended';
      game.winner = result === 'draw' ? 'draw' : result === 'X' ? game.player1 : game.player2;
      activeGames.delete(game.id);

      const endPayload = buildGameBoardPayload(game);
      await interaction.update(endPayload);
      return;
    }

    // Switch turn
    game.turn = game.turn === game.player1 ? game.player2 : game.player1;
    resetGameTimeout(game, interaction);

    const nextPayload = buildGameBoardPayload(game);
    await interaction.update(nextPayload);
  }
}
