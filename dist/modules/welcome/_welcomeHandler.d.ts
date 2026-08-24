import type { ButtonInteraction, ModalSubmitInteraction, GuildMember, PartialGuildMember } from 'discord.js';
export declare function handleWelcomeButton(interaction: ButtonInteraction): Promise<void>;
export declare function handleWelcomeModal(interaction: ModalSubmitInteraction): Promise<void>;
export declare function handleMemberJoin(member: GuildMember): Promise<void>;
export declare function handleMemberLeave(member: GuildMember | PartialGuildMember): Promise<void>;
//# sourceMappingURL=_welcomeHandler.d.ts.map