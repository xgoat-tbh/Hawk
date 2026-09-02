import { constants } from '../../core/config/constants.js';
const pingCooldowns = new Map();
let cleanupTimer = null;
export function startVcCooldownCleanup() {
    if (cleanupTimer)
        return;
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, expiry] of pingCooldowns) {
            if (expiry <= now)
                pingCooldowns.delete(key);
        }
    }, constants.cooldownCleanupInterval);
    cleanupTimer.unref();
}
export function stopVcCooldownCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
    }
}
function makeKey(guildId, identifier) {
    return `${guildId}:${identifier.toLowerCase()}`;
}
export function checkVcCooldown(guildId, identifier, _vcId) {
    const key = makeKey(guildId, identifier);
    const expiry = pingCooldowns.get(key);
    const now = Date.now();
    if (expiry && expiry > now) {
        return Math.ceil((expiry - now) / 1000);
    }
    return 0;
}
export function setVcCooldown(guildId, identifier, vcIdOrSeconds, durationSeconds) {
    const seconds = typeof vcIdOrSeconds === 'number' ? vcIdOrSeconds : (durationSeconds ?? 300);
    if (seconds <= 0)
        return;
    if (pingCooldowns.size >= constants.maxCooldownEntries) {
        const firstKey = pingCooldowns.keys().next().value;
        if (firstKey !== undefined)
            pingCooldowns.delete(firstKey);
    }
    const key = makeKey(guildId, identifier);
    pingCooldowns.set(key, Date.now() + seconds * 1000);
}
export function removeVcCooldown(guildId, identifier) {
    if (identifier) {
        const key = makeKey(guildId, identifier);
        pingCooldowns.delete(key);
    }
    else {
        const prefix = `${guildId}:`;
        for (const key of pingCooldowns.keys()) {
            if (key.startsWith(prefix)) {
                pingCooldowns.delete(key);
            }
        }
    }
}
export function clearVcCooldowns() {
    pingCooldowns.clear();
}
//# sourceMappingURL=GameVcCooldownManager.js.map