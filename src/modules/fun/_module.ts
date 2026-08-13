import type { ModuleManifest } from '../../types/module.js';
import { handleTttButton } from './_tttHandler.js';

export default {
  name: 'fun',
  description: 'Interactive entertainment, mini-games & fun utilities.',
  buttonPrefixes: ['ttt_'],
  onButton: handleTttButton,
} satisfies ModuleManifest;
