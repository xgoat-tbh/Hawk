import type { Client } from 'discord.js';
export declare function checkPvcExpirations(client: Client): Promise<void>;
export declare function startPvcScheduler(client: Client): NodeJS.Timeout;
export declare function stopPvcScheduler(timer: NodeJS.Timeout): void;
//# sourceMappingURL=pvcScheduler.d.ts.map