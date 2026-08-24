/** Create a command definition with sensible defaults */
export function defineCommand(options) {
    const isOwnerModule = options.module === 'owner';
    return {
        aliases: [],
        description: 'No description provided.',
        usage: '',
        examples: [],
        ownerOnly: isOwnerModule,
        botAdminOnly: false,
        permissions: [],
        botPermissions: [],
        cooldown: 0,
        dmAllowed: false,
        hidden: isOwnerModule,
        enabled: true,
        permitOnly: false,
        ...options,
    };
}
//# sourceMappingURL=command.js.map