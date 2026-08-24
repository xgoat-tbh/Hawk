import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { consoleLog } from '../logging/ConsoleLogger.js';
const loadedModules = new Map();
export async function loadModuleManifests(modulesDir, enabledModules) {
    loadedModules.clear();
    let dirs;
    try {
        dirs = await readdir(modulesDir);
    }
    catch {
        consoleLog('warning', 'startup', `Modules directory not found for manifests: ${modulesDir}`);
        return [];
    }
    for (const dir of dirs) {
        // Feature toggle check: if enabledModules is provided, skip dirs not listed
        if (enabledModules && enabledModules.length > 0 && !enabledModules.includes(dir)) {
            consoleLog('info', 'startup', `Module skipped via feature toggle: ${dir}`);
            continue;
        }
        const modulePath = join(modulesDir, dir);
        const dirStat = await stat(modulePath).catch(() => null);
        if (!dirStat?.isDirectory())
            continue;
        // Check for _module.ts or _module.js
        const manifestTs = join(modulePath, '_module.ts');
        const manifestJs = join(modulePath, '_module.js');
        const hasTs = await stat(manifestTs).then(s => s.isFile()).catch(() => false);
        const hasJs = await stat(manifestJs).then(s => s.isFile()).catch(() => false);
        const manifestFile = hasTs ? manifestTs : hasJs ? manifestJs : null;
        if (!manifestFile)
            continue;
        try {
            const fileUrl = pathToFileURL(manifestFile).href;
            const imported = (await import(fileUrl));
            const manifest = imported.default;
            if (!manifest || !manifest.name) {
                consoleLog('warning', 'startup', `Invalid manifest in ${manifestFile}: missing default export or name`);
                continue;
            }
            loadedModules.set(manifest.name, manifest);
            consoleLog('info', 'startup', `Loaded module manifest: ${manifest.name}`);
        }
        catch (error) {
            consoleLog('error', 'startup', `Failed to load module manifest: ${manifestFile}`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return Array.from(loadedModules.values());
}
export function getLoadedModules() {
    return Array.from(loadedModules.values());
}
export function getModuleManifest(name) {
    return loadedModules.get(name);
}
//# sourceMappingURL=ModuleLoader.js.map