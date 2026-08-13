import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { activeGames, buildGameBoardPayload, type TttGame } from './_tttHandler.js';
import { sanitize } from '../../core/utils/validators.js';

export default defineCommand({
  name: 'tictactoe',
  aliases: ['ttt', 'ticktactoe'],
  module: 'fun',
  description: 'Play an interactive game of Tic-Tac-Toe against another member.',
  usage: 'tictactoe <@user>',
  examples: ['ttt @Friend', 'tictactoe @Opponent'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, channel, replyTarget } = ctx;

    if (parsed.args.length === 0 && !replyTarget) {
      await respond.error(`Specify a user to challenge: \`${parsed.prefix}ttt <@user>\` or reply to their message with \`${parsed.prefix}ttt\`.`);
      return;
    }

    let targetMember = replyTarget;
    if (!targetMember && parsed.args.length > 0) {
      const userRes = await resolveUser(parsed.args.join(' '), guild);
      if (!userRes.success) {
        await respond.error(userRes.error || 'Could not resolve target member.');
        return;
      }
      if (!userRes.value.member) {
        await respond.error('That user is not a member of this server.');
        return;
      }
      targetMember = userRes.value.member;
    }

    if (!targetMember) {
      await respond.error('Target user not found in this server.');
      return;
    }

    if (targetMember.id === member.id) {
      await respond.error('You cannot play Tic-Tac-Toe against yourself. Mention another member to challenge them!');
      return;
    }

    if (targetMember.user.bot) {
      await respond.error('You cannot challenge a bot account to Tic-Tac-Toe.');
      return;
    }

    // Check if either player is already in an active game
    for (const game of activeGames.values()) {
      if (
        (game.player1 === member.id || game.player2 === member.id) &&
        (game.status === 'playing' || game.status === 'pending')
      ) {
        await respond.error('You already have an active Tic-Tac-Toe game in progress.');
        return;
      }
      if (
        (game.player1 === targetMember.id || game.player2 === targetMember.id) &&
        (game.status === 'playing' || game.status === 'pending')
      ) {
        await respond.error(`${targetMember.user.username} is already in an active Tic-Tac-Toe match.`);
        return;
      }
    }

    const p1Name = sanitize(member.displayName || member.user.username);
    const p2Name = sanitize(targetMember.displayName || targetMember.user.username);

    const randomId = Math.random().toString(36).slice(2, 9);
    const game: TttGame = {
      id: randomId,
      guildId: guild.id,
      channelId: channel.id,
      player1: member.id,
      player1Name: p1Name,
      player2: targetMember.id,
      player2Name: p2Name,
      turn: member.id,
      board: Array(9).fill(null),
      status: 'pending',
    };

    activeGames.set(randomId, game);

    const payload = buildGameBoardPayload(game);
    const sentMsg = await (channel as GuildTextBasedChannel).send(payload);
    game.messageId = sentMsg.id;

    // 60-second invitation timeout
    setTimeout(async () => {
      const current = activeGames.get(randomId);
      if (current && current.status === 'pending') {
        activeGames.delete(randomId);
        await sentMsg.edit({
          content: 'Tic-Tac-Toe challenge expired (no response from opponent).',
          components: [],
        }).catch(() => {});
      }
    }, 60_000);
  },
});
