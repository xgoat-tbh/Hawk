import { PermissionsBitField } from 'discord.js';
import { env } from '../../core/config/environment.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
// In-memory sliding window cache: key = `${guildId}:${channelId}:${userId}`
const userMessageHistory = new Map();
// Periodic cleanup of stale entries every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, records] of userMessageHistory.entries()) {
        const fresh = records.filter(r => now - r.timestamp < 10_000);
        if (fresh.length === 0) {
            userMessageHistory.delete(key);
        }
        else {
            userMessageHistory.set(key, fresh);
        }
    }
}, 60_000).unref();
export async function handleAntiSpam(message) {
    if (!message.guild || message.author.bot || message.system)
        return;
    const member = message.member;
    const userId = message.author.id;
    const guild = message.guild;
    // Bypass checks: Server Owner, Bot Owner/Admin, Admin or ManageMessages permissions
    if (userId === guild.ownerId)
        return;
    if (env.botOwnerIds.includes(userId) || userId === env.botOwnerId || env.botAdminIds.includes(userId))
        return;
    if (member) {
        if (member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return;
        }
    }
    const now = Date.now();
    const cacheKey = `${guild.id}:${message.channel.id}:${userId}`;
    const normalizedContent = message.content.trim().toLowerCase();
    const history = (userMessageHistory.get(cacheKey) || []).filter(r => now - r.timestamp < 10_000);
    history.push({
        id: message.id,
        content: normalizedContent,
        timestamp: now,
    });
    userMessageHistory.set(cacheKey, history);
    // Check 1: Duplicate message spam (4+ identical messages within 6,000ms)
    const recent6s = history.filter(r => now - r.timestamp <= 6_000);
    const duplicateCluster = recent6s.filter(r => r.content === normalizedContent && r.content.length > 0);
    let isSpam = false;
    let spamReason = '';
    let spamIds = [];
    if (duplicateCluster.length >= 4) {
        isSpam = true;
        spamReason = `Repeated duplicate messages (${duplicateCluster.length} identical messages in <6s)`;
        spamIds = duplicateCluster.map(r => r.id);
    }
    else {
        // Check 2: Rapid burst flood (6+ messages of any kind within 4,000ms)
        const recent4s = history.filter(r => now - r.timestamp <= 4_000);
        if (recent4s.length >= 6) {
            isSpam = true;
            spamReason = `Rapid message burst (${recent4s.length} messages in <4s)`;
            spamIds = recent4s.map(r => r.id);
        }
    }
    if (!isSpam)
        return;
    // Clear tracked history for this user to avoid double triggering
    userMessageHistory.delete(cacheKey);
    const textChannel = message.channel;
    try {
        // Delete the spam messages
        if (textChannel.bulkDelete && spamIds.length > 0) {
            await textChannel.bulkDelete(spamIds, true).catch(async () => {
                // Fallback: Delete current message if bulkDelete fails
                await message.delete().catch(() => { });
            });
        }
        else {
            await message.delete().catch(() => { });
        }
        // Send temporary self-deleting warning
        const warnMsg = await textChannel.send({
            content: `${message.author}, please slow down and refrain from spamming.`,
        }).catch(() => null);
        if (warnMsg) {
            setTimeout(() => {
                warnMsg.delete().catch(() => { });
            }, 5000);
        }
        // Audit and webhook logging
        logAuditAction({
            guild,
            action: 'Auto-Mod | Anti-Spam Triggered',
            executor: 'Hawk Anti-Spam',
            target: message.author.tag,
            channelName: textChannel.name ?? textChannel.id,
            details: [
                `• **User:** ${message.author.tag} (\`${userId}\`)`,
                `• **Messages Purged:** ${spamIds.length}`,
                `• **Reason:** ${spamReason}`,
            ],
        });
        logEvent('warning', 'command_execution', `Anti-Spam triggered for ${message.author.tag}`, {
            userId,
            userTag: message.author.tag,
            guildId: guild.id,
            channelId: textChannel.id,
            deletedCount: spamIds.length,
            reason: spamReason,
        });
    }
    catch (error) {
        consoleLog('error', 'unhandled_exception', `AntiSpam execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=_antiSpamHandler.js.map