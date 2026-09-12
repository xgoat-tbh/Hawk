import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { ui } from '../../core/ui/index.js';

export default defineCommand({
  name: 'item-options',
  aliases: ['itemoptions'],
  module: 'store',
  description: 'Shows all configurable item options, behaviors, and triggers',
  usage: 'item-options',
  examples: ['item-options'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const content =
      `### Store Item Options & Capabilities\n\n` +
      `• **Stock Control:** Set stock count or \`-1\` for unlimited purchases.\n` +
      `• **Usable Items:** Allow users to activate items via \`!use-item <name|id>\`.\n` +
      `• **Sellable Items:** Allow users to sell items back for 50% refund or trade via \`!sell-item\`.\n` +
      `• **Role Requirements:** Require buyers to hold a specific role before purchasing.\n` +
      `• **Role Actions (Given/Removed):** Automatically grant or revoke Discord roles upon usage or purchase.\n` +
      `• **Custom Reply Messages:** Display a custom server message when an item is consumed.\n\n` +
      `*Configure items in real-time via \`!edit-item\` or through the Web Dashboard Store panel.*`;

    const payload = ui.standard({
      title: 'Item Configuration Guide',
      text: content,
    });

    await ctx.channel.send({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
});
