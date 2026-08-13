import type { ModuleManifest } from '../../types/module.js';
import { handleNukeInteraction } from './_nukeHandler.js';

export default {
  name: 'moderation',
  description: 'Moderation suite (ban, kick, mute, purge, lock, role, nuke, snipe)',
  buttonPrefixes: ['nuke_'],
  onButton: handleNukeInteraction,
} satisfies ModuleManifest;
