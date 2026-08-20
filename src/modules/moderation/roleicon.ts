import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { isRoleManageable } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'roleicon',
  aliases: ['ricon', 'setroleicon', 'removeroleicon'],
  module: 'moderation',
  description: 'Set or remove an icon for a specified role using an emoji, image URL, or masked link.',
  usage: 'roleicon <role> [emoji|url|masked_link|none]',
  examples: [
    'roleicon @VIP 👑',
    'roleicon @VIP :custom_emoji:',
    'roleicon @VIP [Icon](https://example.com/icon.png)',
    'roleicon @VIP none',
  ],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}roleicon <role> [emoji|url|masked_link|none]\``);
      return;
    }

    const roleRes = resolveRole(parsed.args[0], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const targetRole = roleRes.value.role;
    if (!isRoleManageable(guild, targetRole, member)) {
      await respond.error(`Cannot modify ${mentionRole(targetRole, guild)} due to role hierarchy or permissions.`);
      return;
    }

    // ── If no second arg or explicit remove keyword -> Remove Role Icon ──
    if (parsed.args.length < 2 || ['none', 'clear', 'remove', 'delete', 'off'].includes(parsed.args[1].toLowerCase())) {
      try {
        await targetRole.setIcon(null, `Role icon removed by ${member.user.tag}`);
        await respond.success(`Removed role icon from ${mentionRole(targetRole, guild)}.`);
        logEvent('info', 'command_execution', `Role icon removed by ${member.user.tag}`, {
          executor: member.user.tag,
          role: targetRole.name,
          guild: guild.name,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await respond.error(`Failed to remove role icon: ${msg}`);
      }
      return;
    }

    const iconInput = parsed.args.slice(1).join(' ').trim();
    let targetIcon: string | null = null;
    let iconType = 'url';

    // 1. Custom Emoji: <a:name:id> or <:name:id>
    const customEmojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d{17,20})>/;
    const customMatch = customEmojiRegex.exec(iconInput);
    if (customMatch) {
      const emojiId = customMatch[3];
      targetIcon = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=96&quality=lossless`;
      iconType = 'custom_emoji';
    }

    // 2. Masked Markdown Link: [text](https://url)
    if (!targetIcon) {
      const maskedLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
      const maskedMatch = maskedLinkRegex.exec(iconInput);
      if (maskedMatch) {
        targetIcon = maskedMatch[2];
        iconType = 'masked_link';
      }
    }

    // 3. Raw URL: https://...
    if (!targetIcon) {
      const rawUrlRegex = /https?:\/\/[^\s]+/;
      const urlMatch = rawUrlRegex.exec(iconInput);
      if (urlMatch) {
        targetIcon = urlMatch[0];
        iconType = 'url';
      }
    }

    // 4. Unicode Emoji (e.g. 👑, 🔥)
    if (!targetIcon) {
      const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
      if (unicodeEmojiRegex.test(iconInput)) {
        targetIcon = iconInput.trim();
        iconType = 'unicode_emoji';
      }
    }

    if (!targetIcon) {
      await respond.error('Please provide a valid emoji, image URL, or masked link for the role icon.');
      return;
    }

    try {
      await targetRole.setIcon(targetIcon, `Role icon updated by ${member.user.tag}`);
      await respond.success(`Successfully set role icon for ${mentionRole(targetRole, guild)}!`);

      logEvent('info', 'command_execution', `Role icon updated by ${member.user.tag}`, {
        executor: member.user.tag,
        role: targetRole.name,
        iconType,
        targetIcon,
        guild: guild.name,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      consoleLog('error', 'command_failure', `roleicon: failed to set icon for ${targetRole.id}`, { error: msg });
      await respond.error(`Failed to set role icon: ${msg}\n*(Note: Server role icons require Server Boost Level 2).*`);
    }
  },
});
