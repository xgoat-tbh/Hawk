import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import { setAfk, getAfkEntriesForGuild, clearAllAfkRecords, } from '../../core/database/repositories/afkRepo.js';
import { buildAfkSetPayload, AFK_ALLOWED_MENTIONS } from './afkUI.js';
import { applyAfkNickname } from './afkSanitizer.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { ui } from '../../core/ui/index.js';
import { mentionUser, timestamp } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
export default defineCommand({
    name: 'afk',
    aliases: ['afklist', 'afkreset', 'afkadmin'],
    module: 'general',
    description: 'Set your AFK status, view active server AFK members, or reset AFK records (Admin/Owner).',
    usage: 'afk [reason] | afk list | afk reset',
    examples: ['afk studying for exams', 'afk eating lunch', 'afk list', 'afk reset', 'afklist', 'afkreset'],
    permissions: [],
    botPermissions: [PermissionsBitField.Flags.SendMessages],
    cooldown: 3,
    async execute(ctx) {
        const { guild, member, channel, parsed, message } = ctx;
        const aliasUsed = parsed.aliasUsed.toLowerCase();
        // ── Direct Reset Shortcut ──
        if (aliasUsed === 'afkreset') {
            await handleAfkReset(ctx);
            return;
        }
        // ── Direct List Shortcut ──
        if (aliasUsed === 'afklist') {
            await handleAfkList(ctx);
            return;
        }
        const firstWord = parsed.args[0]?.toLowerCase();
        // ── Subcommand: list ──
        if (firstWord === 'list' || firstWord === 'show') {
            await handleAfkList(ctx);
            return;
        }
        // ── Subcommand: reset / clear ──
        if (firstWord === 'reset' || firstWord === 'clear') {
            await handleAfkReset(ctx);
            return;
        }
        // ── Default Action: Set AFK ──
        const rawReason = parsed.rawArgs.trim();
        const reason = rawReason || 'AFK';
        // 1. Delete the user's command message (!afk ...)
        message.delete().catch(() => { });
        // 2. Send AFK confirmation message (keep in channel)
        const payload = buildAfkSetPayload(member.id, rawReason);
        const sentMsg = await channel.send({
            ...payload,
            allowedMentions: AFK_ALLOWED_MENTIONS,
        }).catch(() => null);
        // 3. Save AFK record with message and channel tracking
        await setAfk(guild.id, member.id, reason, channel.id, sentMsg?.id);
        // 4. Apply [AFK] nickname prefix
        await applyAfkNickname(member);
        logEvent('info', 'command_execution', `AFK status set by ${member.user.tag}`, {
            user: member.user.tag,
            userId: member.id,
            guild: guild.name,
            guildId: guild.id,
            reason,
        });
    },
});
async function handleAfkList(ctx) {
    const { guild, respond } = ctx;
    const entries = getAfkEntriesForGuild(guild.id);
    if (entries.length === 0) {
        await respond.info('There are currently no members marked as AFK in this server.');
        return;
    }
    const lines = entries.map((e) => {
        const relTime = timestamp(e.startedAt, 'R');
        return `• ${mentionUser(e.userId, guild)} — **${e.reason}** (${relTime})`;
    });
    await ui.paginated(ctx, {
        title: `Active AFK Members (${entries.length})`,
        items: lines,
        pageSize: 8,
        emptyText: 'There are currently no members marked as AFK in this server.',
    });
}
async function handleAfkReset(ctx) {
    const { guild, member, respond } = ctx;
    const authority = getAuthorityLevel(member.id, guild.ownerId);
    if (authority !== AuthorityLevel.Owner) {
        await respond.error('Only the **Bot Owner** can reset all server AFK records.');
        return;
    }
    await clearAllAfkRecords(guild.id);
    await respond.success('Successfully cleared all AFK records and reset AFK cache for this server.');
    logEvent('info', 'command_execution', `Server AFK cache reset by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
    });
}
//# sourceMappingURL=afk.js.map