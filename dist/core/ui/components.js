import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SectionBuilder, ThumbnailBuilder, } from 'discord.js';
import { HawkTheme } from './theme.js';
export function createContainer(options) {
    const container = new ContainerBuilder();
    const accent = options?.accentColor ?? HawkTheme.container.accentColor;
    if (accent !== undefined) {
        container.setAccentColor(accent);
    }
    return container;
}
export function createTextDisplay(content) {
    return new TextDisplayBuilder().setContent(content);
}
export function createSeparator(divider = true, spacing = SeparatorSpacingSize.Small) {
    return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}
export function createThumbnail(url, description) {
    const thumb = new ThumbnailBuilder().setURL(url);
    if (description)
        thumb.setDescription(description);
    return thumb;
}
export function createSection(options) {
    const section = new SectionBuilder().addTextDisplayComponents(createTextDisplay(options.text));
    if (options.button) {
        section.setButtonAccessory(options.button);
    }
    else if (options.thumbnailUrl) {
        section.setThumbnailAccessory(createThumbnail(options.thumbnailUrl));
    }
    return section;
}
export function createButton(options) {
    const button = new ButtonBuilder();
    if (options.url) {
        button.setStyle(ButtonStyle.Link).setURL(options.url);
    }
    else {
        button.setCustomId(options.customId).setStyle(options.style ?? ButtonStyle.Secondary);
    }
    if (options.label)
        button.setLabel(options.label);
    if (options.emoji)
        button.setEmoji(options.emoji);
    if (options.disabled !== undefined)
        button.setDisabled(options.disabled);
    return button;
}
export function createSelectMenu(options) {
    const menu = new StringSelectMenuBuilder().setCustomId(options.customId);
    if (options.placeholder)
        menu.setPlaceholder(options.placeholder);
    if (options.minValues !== undefined)
        menu.setMinValues(options.minValues);
    if (options.maxValues !== undefined)
        menu.setMaxValues(options.maxValues);
    if (options.disabled !== undefined)
        menu.setDisabled(options.disabled);
    const optionBuilders = options.options.map((opt) => {
        const builder = new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value);
        if (opt.description)
            builder.setDescription(opt.description);
        if (opt.emoji)
            builder.setEmoji(opt.emoji);
        if (opt.default)
            builder.setDefault(opt.default);
        return builder;
    });
    menu.addOptions(optionBuilders);
    return menu;
}
//# sourceMappingURL=components.js.map