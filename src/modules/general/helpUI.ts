import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { CommandDefinition } from '../../types/command.js';
import { getModules, getModuleCommands } from '../../core/commands/CommandRegistry.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { sanitize } from '../../core/utils/validators.js';

const MODULE_LABELS: Record<string, string> = {
  voice: 'Voice',
  gaming: 'Gaming',
  suggestion: 'Suggestion',
  confession: 'Confession',
  sticky: 'Sticky',
  moderation: 'Moderation',
  welcome: 'Welcome',
  media: 'Media',
  general: 'General',
  owner: 'Owner',
};

function getModuleLabel(modName: string): string {
  const lower = modName.toLowerCase();
  return MODULE_LABELS[lower] ?? (modName.charAt(0).toUpperCase() + modName.slice(1));
}

export function buildCategoryDropdown(userId: string, activeModule?: string): ActionRowBuilder<StringSelectMenuBuilder> {
  const modules = getModules().filter(m => getModuleCommands(m).length > 0);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`help_category_select_${userId}`)
    .setPlaceholder('Select a category to browse...');

  const options = modules.map((mod) => {
    const label = getModuleLabel(mod);
    const opt = new StringSelectMenuOptionBuilder()
      .setLabel(`${label} Commands`)
      .setValue(mod.toLowerCase());

    if (activeModule && activeModule.toLowerCase() === mod.toLowerCase()) {
      opt.setDefault(true);
    }
    return opt;
  });

  select.addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function buildMainHelpEmbed(prefix: string, userId: string): ComponentV2Payload {
  const modules = getModules().filter(m => getModuleCommands(m).length > 0);

  const moduleLines = modules.map((mod) => {
    const label = getModuleLabel(mod);
    const count = getModuleCommands(mod).length;
    return `• **${label}** — \`${count}\` command${count === 1 ? '' : 's'}`;
  });

  const headerContent =
    '# Amo India Help\n\n' +
    '**Hey there! 👋**\n\n' +
    `Default prefix: \`${prefix}\`\n` +
    `Use \`${prefix}help <command>\` to learn more about a command.\n\n` +
    '**Categories:**\n' +
    moduleLines.join('\n');

  const dropdownRow = buildCategoryDropdown(userId);

  return buildV2Container({
    text: headerContent,
    components: [dropdownRow],
  });
}

export function buildCategoryHelpEmbed(moduleName: string, prefix: string, userId: string): ComponentV2Payload {
  const commands = getModuleCommands(moduleName);
  const label = getModuleLabel(moduleName);

  let bodyContent = `# ${label} Commands\n\n`;

  if (commands.length === 0) {
    bodyContent += 'No commands are currently available in this category.';
  } else {
    const lines = commands.map((cmd) => {
      const aliasStr = cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ') : '—';
      return `**\`${prefix}${cmd.name}\`**\n${sanitize(cmd.description)}\n\`Aliases:\` ${aliasStr}`;
    });
    bodyContent += lines.join('\n\n');
  }

  const dropdownRow = buildCategoryDropdown(userId, moduleName);

  return buildV2Container({
    text: sanitize(bodyContent),
    components: [dropdownRow],
  });
}

export function buildCommandHelpEmbed(command: CommandDefinition, prefix: string): ComponentV2Payload {
  const label = getModuleLabel(command.module);

  const usageStr = command.usage ? `\`${prefix}${command.usage}\`` : `\`${prefix}${command.name}\``;
  const aliasStr = command.aliases.length > 0 ? command.aliases.map(a => `\`${prefix}${a}\``).join(', ') : '—';

  let bodyContent =
    `# Help: ${prefix}${command.name}\n\n` +
    `${sanitize(command.description)}\n\n` +
    `**Category:** ${label}\n` +
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
