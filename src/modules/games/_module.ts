import type { ModuleManifest } from '../../types/module.js';
import { handleMinesButton } from './_minesHandler.js';

export default {
  name: 'games',
  description: 'Minigames sub-module (Coinflip, Mines)',
  buttonPrefixes: ['mines:'],
  onButton: async (interaction) => {
    await handleMinesButton(interaction);
  },
} satisfies ModuleManifest;
