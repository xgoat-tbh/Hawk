import type { ModuleManifest } from '../../types/module.js';
export declare function loadModuleManifests(modulesDir: string, enabledModules?: string[]): Promise<ModuleManifest[]>;
export declare function getLoadedModules(): ModuleManifest[];
export declare function getModuleManifest(name: string): ModuleManifest | undefined;
//# sourceMappingURL=ModuleLoader.d.ts.map