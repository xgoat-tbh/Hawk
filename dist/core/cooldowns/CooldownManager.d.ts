import { AuthorityLevel } from '../../types/permission.js';
export declare function startCooldownCleanup(): void;
export declare function stopCooldownCleanup(): void;
export declare function checkCooldown(userId: string, commandName: string, cooldownSeconds: number, authority: AuthorityLevel): number;
export declare function setCooldown(userId: string, commandName: string, cooldownSeconds: number): void;
export declare function clearAllCooldowns(): void;
//# sourceMappingURL=CooldownManager.d.ts.map