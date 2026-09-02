import { type ComponentV2Payload } from '../../core/ui/index.js';
export declare const AFK_ALLOWED_MENTIONS: {
    readonly parse: readonly [];
    readonly users: readonly [];
    readonly roles: readonly [];
    readonly repliedUser: false;
};
export declare function buildAfkSetPayload(userId: string, reason?: string): ComponentV2Payload;
export declare function buildAfkNoticePayload(afkUsers: {
    userId: string;
    reason: string;
    startedAt: Date;
}[]): ComponentV2Payload;
export declare function buildAfkWelcomeBackPayload(userId: string, elapsedMs: number): ComponentV2Payload;
export declare function buildAfkPastTensePayload(userId: string, reason?: string): ComponentV2Payload;
//# sourceMappingURL=afkUI.d.ts.map