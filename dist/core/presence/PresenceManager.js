import { ActivityType } from 'discord.js';
import { constants } from '../config/constants.js';
import { getCommandCount } from '../commands/CommandRegistry.js';
import { consoleLog } from '../logging/ConsoleLogger.js';
export class PresenceManager {
    static instance = null;
    client = null;
    mode = 'auto';
    rotationIndex = 0;
    tickerInterval = null;
    lastCommandTimestamp = Date.now();
    idleThresholdMs = 10 * 60 * 1000; // 10 minutes of inactivity -> idle
    busyTasks = new Map(); // taskId -> taskDescription
    customConfig = null;
    static getInstance() {
        if (!PresenceManager.instance) {
            PresenceManager.instance = new PresenceManager();
        }
        return PresenceManager.instance;
    }
    init(client) {
        this.client = client;
        this.startTicker();
        this.update();
    }
    setMode(mode) {
        this.mode = mode;
        this.update();
    }
    getMode() {
        return this.mode;
    }
    getCustomConfig() {
        return this.customConfig;
    }
    setCustomPresence(status, activityType, activityText) {
        this.mode = 'custom';
        this.customConfig = { status, activityType, activityText };
        this.update();
    }
    resetToAuto() {
        this.mode = 'auto';
        this.customConfig = null;
        this.busyTasks.clear();
        this.lastCommandTimestamp = Date.now();
        this.update();
    }
    /** Called whenever a command is executed to reset the idle timer */
    recordActivity() {
        const wasIdle = this.isIdle();
        this.lastCommandTimestamp = Date.now();
        if (wasIdle && this.mode === 'auto') {
            this.update();
        }
    }
    /** Register a heavy operation (e.g. shiftvc, purge) to trigger DND status */
    setBusy(taskId, description) {
        this.busyTasks.set(taskId, description);
        this.update();
    }
    /** Clear a busy operation */
    clearBusy(taskId) {
        this.busyTasks.delete(taskId);
        this.update();
    }
    isBusy() {
        return this.busyTasks.size > 0;
    }
    getBusyDescription() {
        if (this.busyTasks.size === 0)
            return null;
        return Array.from(this.busyTasks.values())[0];
    }
    isIdle() {
        return Date.now() - this.lastCommandTimestamp > this.idleThresholdMs;
    }
    getIdleTimeSeconds() {
        return Math.floor((Date.now() - this.lastCommandTimestamp) / 1000);
    }
    startTicker() {
        if (this.tickerInterval)
            clearInterval(this.tickerInterval);
        // Ticker runs every 30 seconds to rotate or check idle status
        this.tickerInterval = setInterval(() => {
            this.rotationIndex++;
            this.update();
        }, 30_000);
    }
    stopTicker() {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval);
            this.tickerInterval = null;
        }
    }
    update() {
        if (!this.client || !this.client.user)
            return;
        try {
            if (this.mode === 'custom' && this.customConfig) {
                this.client.user.setPresence({
                    status: this.customConfig.status,
                    activities: [
                        {
                            name: this.customConfig.activityText,
                            type: this.customConfig.activityType,
                        },
                    ],
                });
                return;
            }
            // ── AUTO / ROTATING MODE ──
            const prefix = constants.defaultPrefix;
            const totalMembers = this.client.guilds.cache.reduce((acc, g) => acc + (g.memberCount ?? 0), 0);
            const totalGuilds = this.client.guilds.cache.size;
            let totalVoice = 0;
            for (const guild of this.client.guilds.cache.values()) {
                totalVoice += guild.voiceStates.cache.size;
            }
            // 1. DND state: Heavy background task ongoing
            if (this.isBusy()) {
                const busyDesc = this.getBusyDescription() ?? 'Processing task';
                this.client.user.setPresence({
                    status: 'dnd',
                    activities: [
                        {
                            name: `Busy: ${busyDesc} | ${prefix}help`,
                            type: ActivityType.Custom,
                        },
                    ],
                });
                return;
            }
            // 2. Idle state: Inactivity threshold exceeded in auto mode
            if (this.mode === 'auto' && this.isIdle()) {
                this.client.user.setPresence({
                    status: 'idle',
                    activities: [
                        {
                            name: `Idle | Watching ${totalMembers.toLocaleString()} members | ${prefix}help`,
                            type: ActivityType.Watching,
                        },
                    ],
                });
                return;
            }
            // 3. Online Active state: Dynamic Rotation
            const totalCommands = getCommandCount();
            const rotationSteps = [
                {
                    name: `${totalMembers.toLocaleString()} members across ${totalGuilds} servers | ${prefix}help`,
                    type: ActivityType.Watching,
                },
                {
                    name: totalVoice > 0 ? `${totalVoice} members in voice channels | ${prefix}help` : `${totalCommands} commands | ${prefix}help`,
                    type: totalVoice > 0 ? ActivityType.Listening : ActivityType.Playing,
                },
                {
                    name: `${prefix}help | ${this.client.user.username}`,
                    type: ActivityType.Watching,
                },
                {
                    name: `Voice & Moderation System | ${prefix}help`,
                    type: ActivityType.Competing,
                },
            ];
            const currentStep = rotationSteps[this.rotationIndex % rotationSteps.length];
            this.client.user.setPresence({
                status: 'online',
                activities: [
                    {
                        name: currentStep.name,
                        type: currentStep.type,
                    },
                ],
            });
        }
        catch (err) {
            consoleLog('warning', 'gateway', `Failed to update presence: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
export const presenceManager = PresenceManager.getInstance();
//# sourceMappingURL=PresenceManager.js.map