export declare class BotError extends Error {
    readonly userMessage: string;
    readonly severity: 'warning' | 'error' | 'critical';
    constructor(message: string, userMessage?: string, severity?: 'warning' | 'error' | 'critical');
}
export declare class CommandError extends BotError {
    constructor(userMessage: string, internalMessage?: string);
}
export declare class PermissionError extends BotError {
    constructor(userMessage: string, internalMessage?: string);
}
export declare class ValidationError extends BotError {
    constructor(userMessage: string, internalMessage?: string);
}
export declare class DatabaseError extends BotError {
    constructor(internalMessage: string);
}
export declare function getUserMessage(error: unknown): string;
export declare function getInternalMessage(error: unknown): string;
//# sourceMappingURL=BotError.d.ts.map