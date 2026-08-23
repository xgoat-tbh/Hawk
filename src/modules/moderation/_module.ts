import type { ModuleManifest } from '../../types/module.js';
import { handleNukeInteraction } from './_nukeHandler.js';
import { handleAntiSpam } from './_antiSpamHandler.js';
import { runStartupSpamCleanup } from './_startupSpamCleaner.js';


export default {
  name: 'moderation',
  description: 'Moderation suite (ban, kick, mute, purge, lock, role, nuke, snipe, anti-spam)',
  buttonPrefixes: ['nuke_'],
  onButton: handleNukeInteraction,
  onMessage: handleAntiSpam,
  onReady: runStartupSpamCleanup,
} satisfies ModuleManifest;

