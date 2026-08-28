import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSessionByOwner, getAccessList } from './pvcService.js';
import { buildPvcInfoEmbed } from './pvcInfoUI.js';

export default defineCommand({
  name: 'i',
  aliases: ['pvc-info', 'info'],
  module: 'pvc',
  description: 'Show info and control panel for your PVC',
  usage: 'i',
  examples: ['i'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const session = await getSessionByOwner(ctx.guild.id, ctx.message.author.id);
    if (!session) {
      await ctx.respond.error("You don't have an active PVC.");
      return;
    }

    const accessList = await getAccessList(session.channelId);
    const { embeds, components } = buildPvcInfoEmbed(session, ctx.message.author.username, accessList, ctx.message.client);
    
    await ctx.respond.raw({ embeds, components });
  },
});
