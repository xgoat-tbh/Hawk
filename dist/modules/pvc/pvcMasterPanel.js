import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ui } from '../../core/ui/index.js';
export function buildMasterPanel() {
    const content = `• **Join to Create:** Connect to the designated Join-to-Create voice channel to claim your private room.\n` +
        `• **Room Extension:** Need more room time? Purchase additional hours with \`!pvc buy <hours>\`.\n` +
        `• **FASTag Auto-Pay:** Automatically renews your room from your economy balance before expiry.\n` +
        `• **Controls:** Use the interactive buttons below to manage access, locks, and room visibility.`;
    const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_master_info').setLabel('Room Info').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('btn_master_lock').setLabel('Lock / Unlock').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('btn_master_hide').setLabel('Hide / Unhide').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('btn_master_fastag').setLabel('Toggle FASTag').setStyle(ButtonStyle.Secondary));
    const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_master_add_user').setLabel('Permit Member').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('btn_master_remove_user').setLabel('Deny Member').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('btn_master_transfer').setLabel('Transfer').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('btn_master_delete').setLabel('Delete Room').setStyle(ButtonStyle.Danger));
    const payload = ui.standard({
        title: 'Private Voice Channel Dashboard',
        text: content,
        components: [row1, row2],
    });
    return { components: payload.components, flags: payload.flags };
}
export async function deployMasterPanel(channel, existingMsgId) {
    const panel = buildMasterPanel();
    if (existingMsgId) {
        try {
            const msg = await channel.messages.fetch(existingMsgId);
            if (msg) {
                await msg.edit(panel);
                return;
            }
        }
        catch {
            // Message not found, send new
        }
    }
    await channel.send(panel);
}
//# sourceMappingURL=pvcMasterPanel.js.map