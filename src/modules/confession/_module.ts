import type { ModuleManifest } from '../../types/module.js';
import {
  handleConfessionButton,
  handleConfessionModal,
  handleConfessionPanelResurface,
  initializeConfessionPanels,
} from './_confessionHandler.js';

export default {
  name: 'confession',
  description: 'Anonymous confession panel system',
  buttonPrefixes: ['conf_', 'confess_'],
  modalPrefixes: ['conf_', 'confess_'],
  onButton: handleConfessionButton,
  onModal: handleConfessionModal,
  onMessage: handleConfessionPanelResurface,
  onReady: initializeConfessionPanels,
} satisfies ModuleManifest;
