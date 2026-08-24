import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ui } from '../../core/ui/index.js';
export function buildConfessionPanel() {
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId('confess_open_modal')
        .setLabel('Submit Confession')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId('confess_info')
        .setLabel('Guidelines')
        .setStyle(ButtonStyle.Secondary));
    return ui.standard({
        title: 'Anonymous Confessions',
        text: 'Share your thoughts, stories, or confessions completely anonymously.\n\n' +
            'Click **Submit Confession** below to submit. Your identity is never displayed on the public post.',
        components: [row],
    });
}
export function buildAnonymousConfessionPayload(content) {
    return ui.standard({
        title: 'Anonymous Confession',
        text: content,
    });
}
//# sourceMappingURL=confessionUI.js.map