export class BotError extends Error {
    userMessage;
    severity;
    constructor(message, userMessage = 'An unexpected error occurred.', severity = 'error') {
        super(message);
        this.userMessage = userMessage;
        this.severity = severity;
        this.name = 'BotError';
    }
}
export class CommandError extends BotError {
    constructor(userMessage, internalMessage) {
        super(internalMessage ?? userMessage, userMessage, 'warning');
        this.name = 'CommandError';
    }
}
export class PermissionError extends BotError {
    constructor(userMessage, internalMessage) {
        super(internalMessage ?? userMessage, userMessage, 'warning');
        this.name = 'PermissionError';
    }
}
export class ValidationError extends BotError {
    constructor(userMessage, internalMessage) {
        super(internalMessage ?? userMessage, userMessage, 'warning');
        this.name = 'ValidationError';
    }
}
export class DatabaseError extends BotError {
    constructor(internalMessage) {
        super(internalMessage, 'A database error occurred. Please try again later.', 'error');
        this.name = 'DatabaseError';
    }
}
export function getUserMessage(error) {
    if (error instanceof BotError)
        return error.userMessage;
    return 'An unexpected error occurred.';
}
export function getInternalMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
//# sourceMappingURL=BotError.js.map