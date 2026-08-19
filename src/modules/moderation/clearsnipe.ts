import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { clearChannelSnipe } from './SnipeManager.js';

export default defineCommand({
  name: 'clearsnipe',
  aliases: ['cs', 'csnipe'],
  module: 'moderation',
  description: 'Clear snipe and edit snipe history for this channel.',
  usage: 'clearsnipe',
  examples: ['clearsnipe'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { channel, respond } = ctx;

    const cleared = clearChannelSnipe(channel.id);
    if (cleared) {
      await respond.success('Snipe history has been cleared for this channel.');
    } else {
      await respond.info('No active snipe or edit snipe records found for this channel.');
    }
  },
});
