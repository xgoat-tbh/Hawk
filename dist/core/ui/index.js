import { AmoTheme } from './theme.js';
import { buildCustomId, parseCustomId, isInteractionOwner } from './customId.js';
import { createContainer, createTextDisplay, createSeparator, createButton, createSelectMenu, createSection, createThumbnail, } from './components.js';
import { status } from './status.js';
import { standard, dashboard, paginated } from './layouts.js';
export const ui = {
    theme: AmoTheme,
    // Custom ID utilities
    customId: {
        build: buildCustomId,
        parse: parseCustomId,
        isOwner: isInteractionOwner,
    },
    // Base Component Factories
    container: createContainer,
    text: createTextDisplay,
    separator: createSeparator,
    button: createButton,
    select: createSelectMenu,
    section: createSection,
    thumbnail: createThumbnail,
    // Status Responses
    success: status.success,
    error: status.error,
    warning: status.warning,
    info: status.info,
    empty: status.empty,
    loading: status.loading,
    // Layout Templates
    standard,
    dashboard,
    paginated,
};
export { AmoTheme, HawkTheme } from './theme.js';
export * from './customId.js';
export * from './components.js';
export * from './status.js';
export * from './layouts.js';
//# sourceMappingURL=index.js.map