import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { CommandDefinition } from '../../types/command.js';
import { getModuleCommands } from '../../core/commands/CommandRegistry.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { sanitize } from '../../core/utils/validators.js';

export interface HelpCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  modules: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'moderation',
    name: 'Moderation',
    emoji: '🛡️',
    description: 'Server management, bans, mutes, locks, purges, and roles',
    modules: ['moderation'],
  },
  {
    id: 'voice',
    name: 'Voice Controls',
    emoji: '🔊',
    description: 'Voice channel movement, follow-me-vc, locks, and tracking',
    modules: ['voice'],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    emoji: '🎮',
    description: 'Game LFG ping notifications and game role settings',
    modules: ['gaming'],
  },
  {
    id: 'community',
    name: 'Community',
    emoji: '💬',
    description: 'Suggestions, confessions, sticky messages, welcome, and media filters',
    modules: ['suggestion', 'confession', 'sticky', 'welcome', 'media'],
  },
  {
    id: 'general',
    name: 'General & Info',
    emoji: '⚙️',
    description: 'Bot statistics, AFK status, emoji stealing, access & restrictions',
    modules: ['general', 'owner'],
  },
];

export function getCategory(categoryId: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find(c => c.id.toLowerCase() === categoryId.toLowerCase());
}

export function getCategoryCommands(categoryId: string): CommandDefinition[] {
  const cat = getCategory(categoryId);
  if (!cat) return [];

  const cmds: CommandDefinition[] = [];
  for (const mod of cat.modules) {
    const modCmds = getModuleCommands(mod);
    cmds.push(...modCmds);
  }
  return cmds;
}

export function buildCategoryDropdown(userId: string, activeCategoryId?: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`help_category_select_${userId}`)
    .setPlaceholder('Select a category to browse...');

  const options = HELP_CATEGORIES.map((cat) => {
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(`${cat.name} Commands`)
      .setValue(cat.id)
      .setEmoji(cat.emoji)
      .setDescription(cat.description);

    if (activeCategoryId && activeCategoryId.toLowerCase() === cat.id.toLowerCase()) {
      opt.setDefault(true);
    }
    return opt;
  });

  select.addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function buildMainHelpEmbed(prefix: string, userId: string): ComponentV2Payload {
  const categoryLines = HELP_CATEGORIES.map((cat) => {
    const count = getCategoryCommands(cat.id).length;
    return `• ${cat.emoji} **${cat.name}** — \`${count}\` command${count === 1 ? '' : 's'}`;
  });

  const headerContent =
    '# Amo Help\n\n' +
    '**Hey there! 👋**\n\n' +
    `Default prefix: \`${prefix}\`\n` +
    `Use \`${prefix}help <command>\` to learn more about a command.\n\n` +
    '**Categories:**\n' +
    categoryLines.join('\n');

  const dropdownRow = buildCategoryDropdown(userId);

  return buildV2Container({
    text: headerContent,
    components: [dropdownRow],
  });
}

export function buildCategoryHelpEmbed(
  categoryId: string,
  prefix: string,
  userId: string,
  page = 1,
): ComponentV2Payload {
  const cat = getCategory(categoryId) || HELP_CATEGORIES[0];
  const commands = getCategoryCommands(cat.id);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(commands.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));

  let bodyContent = `# ${cat.emoji} ${cat.name} Commands\n\n`;

  if (commands.length === 0) {
    bodyContent += 'No commands are currently available in this category.';
  } else {
    const start = (currentPage - 1) * pageSize;
    const pageCmds = commands.slice(start, start + pageSize);

    const lines = pageCmds.map((cmd) => {
      const aliasStr = cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ') : '—';
      return `**\`${prefix}${cmd.name}\`**\n${sanitize(cmd.description)}\n\`Aliases:\` ${aliasStr}`;
    });

    bodyContent += `${lines.join('\n\n')}\n\n*Page ${currentPage}/${totalPages} (Total: ${commands.length})*`;
  }

  const components: ActionRowBuilder<any>[] = [];

  if (totalPages > 1) {
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`help_page_prev_${cat.id}_${currentPage}_${userId}`)
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1),
      new ButtonBuilder()
        .setCustomId(`help_page_indicator`)
        .setLabel(`${currentPage} / ${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`help_page_next_${cat.id}_${currentPage}_${userId}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages),
    );
    components.push(buttonRow);
  }

  components.push(buildCategoryDropdown(userId, cat.id));

  return buildV2Container({
    text: sanitize(bodyContent),
    components,
  });
}

export function buildCommandHelpEmbed(command: CommandDefinition, prefix: string): ComponentV2Payload {
  const cat = HELP_CATEGORIES.find(c => c.modules.includes(command.module.toLowerCase()));
  const catLabel = cat ? `${cat.emoji} ${cat.name}` : command.module;

  const usageStr = command.usage ? `\`${prefix}${command.usage}\`` : `\`${prefix}${command.name}\``;
  const aliasStr = command.aliases.length > 0 ? command.aliases.map(a => `\`${prefix}${a}\``).join(', ') : '—';

  let bodyContent =
    `# Help: ${prefix}${command.name}\n\n` +
    `${sanitize(command.description)}\n\n` +
    `**Category:** ${catLabel}\n` +
    `**Usage:** ${usageStr}\n` +
    `**Aliases:** ${aliasStr}`;

  if (command.examples.length > 0) {
    const formattedExamples = command.examples.map(ex => `• \`${prefix}${ex}\``).join('\n');
    bodyContent += `\n\n**Examples:**\n${formattedExamples}`;
  }

  return buildV2Container({
    text: sanitize(bodyContent),
  });
}
