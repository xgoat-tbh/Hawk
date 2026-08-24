import { ui } from '../ui/index.js';
export function renderProgressBar(current, total, width = 10) {
    const safeTotal = Math.max(1, total);
    const safeCurrent = Math.min(safeTotal, Math.max(0, current));
    const percent = Math.round((safeCurrent / safeTotal) * 100);
    const filled = Math.round((percent / 100) * width);
    const empty = Math.max(0, width - filled);
    const bar = '▓'.repeat(filled) + '░'.repeat(empty);
    return `${bar} \`${percent}%\``;
}
export class LiveProgressTracker {
    progressMsg;
    title;
    total;
    lastUpdateMs = 0;
    minIntervalMs = 1500; // Throttle edits to 1.5s to comply with Discord rate limits
    constructor(progressMsg, title, total) {
        this.progressMsg = progressMsg;
        this.title = title;
        this.total = total;
    }
    async update(current, extraStats, force = false) {
        const now = Date.now();
        if (!force && current < this.total && now - this.lastUpdateMs < this.minIntervalMs) {
            return;
        }
        this.lastUpdateMs = now;
        const barStr = renderProgressBar(current, this.total);
        const sections = [
            `**Progress:** ${barStr} (${current}/${this.total})`,
        ];
        if (extraStats) {
            sections.push(extraStats);
        }
        const payload = ui.standard({
            title: this.title,
            sections,
        });
        await this.progressMsg.edit({
            content: undefined,
            components: payload.components,
        }).catch(() => { });
    }
}
//# sourceMappingURL=ProgressBar.js.map