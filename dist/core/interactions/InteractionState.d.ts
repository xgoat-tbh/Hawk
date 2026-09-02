export declare function startInteractionCleanup(): void;
export declare function stopInteractionCleanup(): void;
export declare function setState<T>(key: string, userId: string, data: T, ttlMs?: number): void;
export declare function getState<T>(key: string, userId: string): T | null;
export declare function deleteState(key: string): void;
export declare function hasState(key: string): boolean;
export declare function getStateAnyUser<T>(key: string): T | null;
//# sourceMappingURL=InteractionState.d.ts.map