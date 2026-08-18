import { AmoTheme } from './theme.js';
import { buildCustomId, parseCustomId, isInteractionOwner } from './customId.js';
import {
  createContainer,
  createTextDisplay,
  createSeparator,
  createButton,
  createSelectMenu,
} from './components.js';
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
} as const;

export type AmoUI = typeof ui;
export type HawkUI = typeof ui;
export { AmoTheme, HawkTheme } from './theme.js';
export * from './customId.js';
export * from './components.js';
export * from './status.js';
export * from './layouts.js';

