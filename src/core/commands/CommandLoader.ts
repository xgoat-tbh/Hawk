import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CommandDefinition } from '../../types/command.js';
import { registerCommand } from './CommandRegistry.js';
import { consoleLog } from '../logging/ConsoleLogger.js';

export async function loadCommands(modulesDir: string, enabledModules?: string[]): Promise<number> {
  let count = 0;
  let moduleDirs: string[];
  try {
    moduleDirs = await readdir(modulesDir);
  } catch {
    consoleLog('warning', 'startup', `Modules directory not found: ${modulesDir}`);
    return 0;
  }

  for (const dir of moduleDirs) {
    if (enabledModules && enabledModules.length > 0 && !enabledModules.includes(dir)) {
      consoleLog('info', 'startup', `Commands skipped for disabled module: ${dir}`);
      continue;
    }

    const modulePath = join(modulesDir, dir);
    const dirStat = await stat(modulePath).catch(() => null);
    if (!dirStat?.isDirectory()) continue;

    let files: string[];
    try {
      files = await readdir(modulePath);
    } catch {
      continue;
    }

    for (const file of files) {
      if (file === 'index.ts' || file === 'index.js' || file.endsWith('.d.ts') || file.endsWith('.map')) continue;
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

      // Skip non-command helper/handler files starting with '_' or helper suffixes
      const cleanName = file.replace(/\.(ts|js)$/, '');
      if (
        file.startsWith('_') ||
        cleanName.endsWith('UI') ||
        cleanName.endsWith('Handler') ||
        cleanName.endsWith('Manager') ||
        cleanName.endsWith('Evaluator') ||
        cleanName.endsWith('Engine') ||
        cleanName.endsWith('Detector') ||
        cleanName.endsWith('Helpers') ||
        cleanName.endsWith('Helper') ||
        cleanName.endsWith('Sanitizer') ||
        cleanName.endsWith('Service') ||
        cleanName.endsWith('Cleaner')
      ) {
        continue;
      }

      const filePath = join(modulePath, file);
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const imported = (await import(fileUrl)) as { default?: CommandDefinition | CommandDefinition[] };

        if (!imported.default) {
          consoleLog('warning', 'startup', `No default export in ${filePath}`);
          continue;
        }

        const cmds = Array.isArray(imported.default) ? imported.default : [imported.default];
        for (const cmd of cmds) {
          if (!cmd.name || !cmd.execute) {
            consoleLog('warning', 'startup', `Invalid command in ${filePath}: missing name or execute`);
            continue;
          }
          registerCommand(cmd);
          count++;
        }
      } catch (error) {
        consoleLog('error', 'startup', `Failed to load command file: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return count;
}
