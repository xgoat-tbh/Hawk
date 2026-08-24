import { handleNukeInteraction } from './_nukeHandler.js';
import { handleAntiSpam } from './_antiSpamHandler.js';
import { runStartupSpamCleanup } from './_startupSpamCleaner.js';
declare const _default: {
    name: string;
    description: string;
    buttonPrefixes: string[];
    onButton: typeof handleNukeInteraction;
    onMessage: typeof handleAntiSpam;
    onReady: typeof runStartupSpamCleanup;
};
export default _default;
//# sourceMappingURL=_module.d.ts.map