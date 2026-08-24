export function buildCustomId(prefix, action, ownerId, extra) {
    const parts = [prefix, action];
    if (ownerId)
        parts.push(ownerId);
    if (extra)
        parts.push(extra);
    return parts.join('_');
}
export function parseCustomId(customId) {
    const parts = customId.split('_');
    return {
        prefix: parts[0] || '',
        action: parts[1] || '',
        ownerId: parts[2],
        extra: parts.slice(3).join('_') || undefined,
    };
}
export function isInteractionOwner(interaction, ownerId) {
    if (!ownerId)
        return true;
    return interaction.user.id === ownerId;
}
//# sourceMappingURL=customId.js.map