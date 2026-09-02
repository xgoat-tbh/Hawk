export declare function startVcCooldownCleanup(): void;
export declare function stopVcCooldownCleanup(): void;
export declare function checkVcCooldown(guildId: string, identifier: string, _vcId?: string): number;
export declare function setVcCooldown(guildId: string, identifier: string, vcIdOrSeconds: string | number, durationSeconds?: number): void;
export declare function removeVcCooldown(guildId: string, identifier?: string): void;
export declare function clearVcCooldowns(): void;
//# sourceMappingURL=GameVcCooldownManager.d.ts.map