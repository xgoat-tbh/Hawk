import type { Message } from 'discord.js';
export declare function renderProgressBar(current: number, total: number, width?: number): string;
export declare class LiveProgressTracker {
    private progressMsg;
    private title;
    private total;
    private lastUpdateMs;
    private minIntervalMs;
    constructor(progressMsg: Message, title: string, total: number);
    update(current: number, extraStats?: string, force?: boolean): Promise<void>;
}
//# sourceMappingURL=ProgressBar.d.ts.map