import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel, User, MessageReaction } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { branding, toReactableEmoji } from '../../core/config/branding.js';
import { sanitize } from '../../core/utils/validators.js';

export default defineCommand({
  name: 'reactgame',
  aliases: ['rg', 'fastreact', 'speedreact', 'reactiongame'],
  module: 'fun',
  description: 'Test your reaction speed! The first player to click the reaction on the message wins.',
  usage: 'reactgame',
  examples: ['reactgame', 'rg', 'fastreact'],
  permissions: [],
  botPermissions: [
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.ReadMessageHistory,
  ],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, channel } = ctx;

    const initialPayload = buildV2Container({
      text:
        `# Emoji Reaction Speed Test\n\n` +
        `Get ready! A reaction will appear on this message shortly.\n` +
        `The **first** person to click the reaction wins!`,
    });

    const gameMsg = await (channel as GuildTextBasedChannel).send(initialPayload);

    // Random countdown delay between 2.5s and 5.5s to prevent spam-clicking
    const delayMs = Math.floor(Math.random() * 3000) + 2500;
    await new Promise((r) => setTimeout(r, delayMs));

    // Choose target reactable emoji
    const candidateEmojis = [
      branding.emojis.upvote,
      branding.emojis.accepted,
      branding.emojis.considered,
      branding.emojis.success,
    ].filter(Boolean);

    let rawTarget = candidateEmojis[Math.floor(Math.random() * candidateEmojis.length)] || '';
    let targetEmoji = toReactableEmoji(rawTarget);

    if (!targetEmoji) {
      const guildEmoji = guild.emojis.cache.first();
      targetEmoji = guildEmoji ? guildEmoji.id : '1533549488541663283';
    }

    const reactSuccess = await gameMsg.react(targetEmoji).catch(() => null);
    if (!reactSuccess) {
      // Fallback to standard reactable custom emoji ID
      await gameMsg.react('1533549488541663283').catch(() => {});
    }

    const startTime = Date.now();

    const goPayload = buildV2Container({
      text:
        `# Emoji Reaction Speed Test — GO!\n\n` +
        `**CLICK THE REACTION BELOW AS FAST AS YOU CAN!**`,
    });
    await gameMsg.edit(goPayload).catch(() => {});

    const filter = (_reaction: MessageReaction, user: User) => !user.bot;
    const collector = gameMsg.createReactionCollector({ filter, max: 1, time: 15_000 });

    collector.on('collect', async (_reaction: MessageReaction, user: User) => {
      const reactionTimeMs = Date.now() - startTime;
      const reactionTimeSec = (reactionTimeMs / 1000).toFixed(2);
      const winnerMember = await guild.members.fetch(user.id).catch(() => null);
      const winnerName = sanitize(winnerMember?.displayName || user.username);

      const winPayload = buildV2Container({
        text:
          `# Emoji Reaction Speed Test — Winner!\n\n` +
          `• **Winner:** **${winnerName}**\n` +
          `• **Reaction Time:** \`${reactionTimeSec}s\`\n\n` +
          `Congratulations! You had the fastest reaction in the server.`,
      });

      await gameMsg.edit(winPayload).catch(() => {});
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        const timeoutPayload = buildV2Container({
          text:
            `# Emoji Reaction Speed Test — Timed Out!\n\n` +
            `No one clicked the reaction within 15 seconds. Match expired.`,
        });
        await gameMsg.edit(timeoutPayload).catch(() => {});
      }
    });
  },
});
