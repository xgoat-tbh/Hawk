import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, } from 'discord.js';
import { ui } from '../../core/ui/index.js';
export function buildPvcInfoPayload(session, ownerName, accessList, client) {
    const fastagBadge = session.autoPayEnabled ? '`Enabled`' : '`Disabled`';
    const lockStatus = session.isLocked ? '`Locked`' : '`Unlocked`';
    const hideStatus = session.isHidden ? '`Hidden`' : '`Visible`';
    const userLimit = session.userLimit ? `\`${session.userLimit}\`` : '`Unlimited`';
    const expiryTimestamp = Math.floor(session.expiresAt.getTime() / 1000);
    const allowedUsers = accessList.filter(a => a.access === 'ALLOW' && a.targetType === 'USER');
    const permittedStr = allowedUsers.length > 0
        ? allowedUsers.map(a => `<@${a.targetId}>`).join(', ')
        : '*None*';
    const content = `• **Owner:** **${ownerName}**\n` +
        `• **Room Status:** ${lockStatus} · ${hideStatus}\n` +
        `• **Member Limit:** ${userLimit}\n` +
        `• **FASTag Auto-Pay:** ${fastagBadge}\n` +
        `• **Room Expiry:** <t:${expiryTimestamp}:R> (<t:${expiryTimestamp}:t>)\n` +
        `• **Permitted Members:** ${permittedStr}`;
    const components = [];
    // Row 1: Add User Select
    const addUserSelect = new UserSelectMenuBuilder()
        .setCustomId('pvc_select_add_user')
        .setPlaceholder('Permit members to join your PVC')
        .setMinValues(1)
        .setMaxValues(10);
    components.push(new ActionRowBuilder().addComponents(addUserSelect));
    // Row 2: Remove User Select (if members permitted)
    if (allowedUsers.length > 0) {
        const removeUserSelect = new StringSelectMenuBuilder()
            .setCustomId('pvc_select_remove_user')
            .setPlaceholder('Revoke permissions from members')
            .setMinValues(1)
            .setMaxValues(Math.min(allowedUsers.length, 10));
        for (const a of allowedUsers.slice(0, 25)) {
            const u = client?.users?.cache?.get(a.targetId);
            removeUserSelect.addOptions({
                label: u ? u.username : `User ${a.targetId}`,
                value: a.targetId,
            });
        }
        components.push(new ActionRowBuilder().addComponents(removeUserSelect));
    }
    // Row 3: Quick Action Buttons
    const row3 = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId('pvc_btn_lock')
        .setLabel(session.isLocked ? 'Unlock' : 'Lock')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId('pvc_btn_hide')
        .setLabel(session.isHidden ? 'Unhide' : 'Hide')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId('pvc_btn_fastag')
        .setLabel('FASTag')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId('pvc_btn_delete')
        .setLabel('Delete Room')
        .setStyle(ButtonStyle.Danger));
    components.push(row3);
    // Row 4: Customization Buttons
    const row4 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('pvc_btn_rename').setLabel('Rename').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('pvc_btn_limit').setLabel('Set Limit').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('pvc_btn_transfer').setLabel('Transfer').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('pvc_btn_friends').setLabel('Add Friends').setStyle(ButtonStyle.Secondary));
    components.push(row4);
    const payload = ui.standard({
        title: `Private Voice Channel Settings`,
        text: content,
        components,
    });
    return { components: payload.components, flags: payload.flags };
}
export function buildPvcInfoEmbed(session, ownerName, accessList, client) {
    const payload = buildPvcInfoPayload(session, ownerName, accessList, client);
    return { embeds: [], components: payload.components, flags: payload.flags };
}
//# sourceMappingURL=pvcInfoUI.js.map