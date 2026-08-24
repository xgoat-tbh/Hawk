import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField, } from 'discord.js';
import { getModuleCommands, getAllCommands } from '../../core/commands/CommandRegistry.js';
import { ui } from '../../core/ui/index.js';
import { sanitize } from '../../core/utils/validators.js';
export const HELP_CATEGORIES = [
    {
        id: 'moderation',
        name: 'Moderation',
        description: 'Server management, bans, mutes, locks, purges, audit logs, and roles',
        modules: ['moderation'],
    },
    {
        id: 'voice',
        name: 'Voice Controls',
        description: 'Voice channel movement, follow-me-vc, locks, and tracking',
        modules: ['voice'],
    },
    {
        id: 'gaming',
        name: 'Gaming',
        description: 'Game LFG ping notifications and game role settings',
        modules: ['gaming'],
    },
    {
        id: 'community',
        name: 'Community',
        description: 'Suggestions, confessions, sticky messages, welcome, and media filters',
        modules: ['suggestion', 'confession', 'sticky', 'welcome', 'media'],
    },
    {
        id: 'general',
        name: 'General & Info',
        description: 'Bot statistics, AFK status, and emoji stealing',
        modules: ['general'],
    },
];
export function getCategory(categoryId) {
    return HELP_CATEGORIES.find(c => c.id.toLowerCase() === categoryId.toLowerCase());
}
export function getCategoryCommands(categoryId) {
    const cat = getCategory(categoryId);
    if (!cat)
        return [];
    const cmds = [];
    for (const mod of cat.modules) {
        const modCmds = getModuleCommands(mod);
        cmds.push(...modCmds);
    }
    return cmds.filter(c => c.name !== 'help' && !c.hidden && !c.ownerOnly && c.module !== 'owner');
}
export function buildCategoryDropdown(userId, activeCategoryId, usableSet) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`help_category_select_${userId}`)
        .setPlaceholder('Select a category to browse...');
    const options = HELP_CATEGORIES.map((cat) => {
        const allCatCmds = getCategoryCommands(cat.id);
        const usableCount = usableSet
            ? allCatCmds.filter(c => usableSet.has(c.name)).length
            : allCatCmds.length;
        const isRestricted = usableSet && usableCount === 0;
        const labelStr = isRestricted
            ? `${cat.name} [Restricted]`
            : `${cat.name} (${usableCount}/${allCatCmds.length})`;
        const opt = new StringSelectMenuOptionBuilder()
            .setLabel(labelStr)
            .setValue(cat.id)
            .setDescription(isRestricted ? 'You do not have permission to use commands in this category.' : cat.description);
        if (activeCategoryId && activeCategoryId.toLowerCase() === cat.id.toLowerCase()) {
            opt.setDefault(true);
        }
        return opt;
    });
    select.addOptions(options);
    return new ActionRowBuilder().addComponents(select);
}
export function buildMainHelpEmbed(prefix, userId, usableSet) {
    const allFiltered = getAllCommands().filter(c => c.name !== 'help');
    const totalAll = allFiltered.length;
    const totalUsable = usableSet
        ? allFiltered.filter(c => usableSet.has(c.name)).length
        : totalAll;
    const categoryLines = HELP_CATEGORIES.map((cat) => {
        const allCmds = getCategoryCommands(cat.id);
        const usableCount = usableSet
            ? allCmds.filter(c => usableSet.has(c.name)).length
            : allCmds.length;
        return `• **${cat.name}** — \`${usableCount}/${allCmds.length}\` commands available`;
    });
    const headerContent = `• **Prefix:** \`${prefix}\`\n` +
        `• **Commands Available:** \`${totalUsable}/${totalAll}\`\n\n` +
        '**Category Directory:**\n' +
        categoryLines.join('\n');
    const dropdownRow = buildCategoryDropdown(userId, undefined, usableSet);
    return ui.standard({
        title: 'Command Directory',
        text: headerContent,
        components: [dropdownRow],
    });
}
export function buildCategoryHelpEmbed(categoryId, prefix, userId, page = 1, usableSet) {
    const cat = getCategory(categoryId) || HELP_CATEGORIES[0];
    const allCatCommands = getCategoryCommands(cat.id);
    const commands = usableSet
        ? allCatCommands.filter(c => usableSet.has(c.name))
        : allCatCommands;
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(commands.length / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    let bodyContent = `> ${cat.description}\n\n`;
    if (commands.length === 0) {
        bodyContent += '*You do not have permission or a custom permit to execute commands in this category.*';
    }
    else {
        const start = (currentPage - 1) * pageSize;
        const pageCmds = commands.slice(start, start + pageSize);
        const lines = pageCmds.map((cmd) => {
            const aliasStr = cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ') : 'None';
            const syntaxStr = cmd.usage ? `\`${prefix}${cmd.usage}\`` : `\`${prefix}${cmd.name}\``;
            return (`**\`${prefix}${cmd.name}\`** — ${sanitize(cmd.description)}\n` +
                `• **Syntax:** ${syntaxStr}\n` +
                `• **Aliases:** ${aliasStr}`);
        });
        bodyContent += `${lines.join('\n\n')}\n\n*Page ${currentPage}/${totalPages} — Showing ${pageCmds.length} of ${commands.length} commands*`;
    }
    const components = [];
    if (totalPages > 1) {
        const buttonRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId(`help_page_prev_${cat.id}_${currentPage}_${userId}`)
            .setLabel('Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage <= 1), new ButtonBuilder()
            .setCustomId(`help_page_indicator`)
            .setLabel(`${currentPage} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true), new ButtonBuilder()
            .setCustomId(`help_page_next_${cat.id}_${currentPage}_${userId}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages));
        components.push(buttonRow);
    }
    components.push(buildCategoryDropdown(userId, cat.id, usableSet));
    return ui.standard({
        title: `${cat.name} Commands`,
        text: sanitize(bodyContent),
        components,
    });
}
function formatPermissions(perms) {
    if (!perms || perms.length === 0)
        return 'None';
    return perms.map(p => new PermissionsBitField(p).toArray().join(', ')).filter(Boolean).join(', ') || 'None';
}
export function buildCommandHelpEmbed(command, prefix) {
    const cat = HELP_CATEGORIES.find(c => c.modules.includes(command.module.toLowerCase()));
    const catLabel = cat ? cat.name : command.module;
    const usageStr = command.usage ? `\`${prefix}${command.usage}\`` : `\`${prefix}${command.name}\``;
    const aliasStr = command.aliases.length > 0 ? command.aliases.map(a => `\`${prefix}${a}\``).join(', ') : 'None';
    const userPermsStr = formatPermissions(command.permissions);
    const botPermsStr = formatPermissions(command.botPermissions);
    const cooldownStr = `${command.cooldown ?? 3}s`;
    let bodyContent = `${sanitize(command.description)}\n\n` +
        `• **Category:** ${catLabel}\n` +
        `• **Usage:** ${usageStr}\n` +
        `• **Aliases:** ${aliasStr}\n` +
        `• **Cooldown:** \`${cooldownStr}\`\n` +
        `• **User Permissions:** \`${userPermsStr}\`\n` +
        `• **Bot Permissions:** \`${botPermsStr}\``;
    if (command.examples.length > 0) {
        const formattedExamples = command.examples.map(ex => `• \`${prefix}${ex}\``).join('\n');
        bodyContent += `\n\n**Examples:**\n${formattedExamples}`;
    }
    return ui.standard({
        title: `Command: ${prefix}${command.name}`,
        text: sanitize(bodyContent),
    });
}
//# sourceMappingURL=helpUI.js.map