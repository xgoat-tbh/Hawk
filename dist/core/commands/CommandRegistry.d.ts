import type { CommandDefinition } from '../../types/command.js';
export declare function registerCommand(command: CommandDefinition): void;
export declare function resolveCommand(nameOrAlias: string): CommandDefinition | null;
export declare function getModuleCommands(moduleName: string, includeHidden?: boolean): CommandDefinition[];
export declare function getModules(includeOwner?: boolean): string[];
export declare function getAllCommands(includeOwner?: boolean): CommandDefinition[];
export declare function getCommandCount(includeOwner?: boolean): number;
export declare function isRegistered(nameOrAlias: string): boolean;
//# sourceMappingURL=CommandRegistry.d.ts.map