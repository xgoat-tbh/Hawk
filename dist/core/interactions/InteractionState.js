import { constants } from '../config/constants.js';
const store = new Map();
let cleanupTimer = null;
export function startInteractionCleanup() {
    if (cleanupTimer)
        return;
    cleanupTimer = setInterval(() => { const now = Date.now(); for (const [key, entry] of store) {
        if (entry.expiresAt <= now)
            store.delete(key);
    } }, 60_000);
    cleanupTimer.unref();
}
export function stopInteractionCleanup() { if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
} }
export function setState(key, userId, data, ttlMs = constants.interactionStateTtl) {
    if (store.size >= constants.maxInteractionStates) {
        const firstKey = store.keys().next().value;
        if (firstKey !== undefined)
            store.delete(firstKey);
    }
    store.set(key, { data, userId, expiresAt: Date.now() + ttlMs });
}
export function getState(key, userId) {
    const entry = store.get(key);
    if (!entry)
        return null;
    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
    }
    if (entry.userId !== userId)
        return null;
    return entry.data;
}
export function deleteState(key) { store.delete(key); }
export function hasState(key) {
    const entry = store.get(key);
    if (!entry)
        return false;
    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return false;
    }
    return true;
}
export function getStateAnyUser(key) {
    const entry = store.get(key);
    if (!entry)
        return null;
    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return null;
    }
    return entry.data;
}
//# sourceMappingURL=InteractionState.js.map