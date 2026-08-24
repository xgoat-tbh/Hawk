import { ChannelType, PermissionsBitField } from 'discord.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
export async function runStartupSpamCleanup(client) {
    consoleLog('info', 'startup_cleaner', 'Starting background scan for existing spam message clusters across channels...');
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let totalPurgedAcrossGuilds = 0;
    for (const guild of client.guilds.cache.values()) {
        try {
            const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
            if (!me)
                continue;
            // Filter accessible text channels
            const channels = guild.channels.cache.filter((c) => {
                if (c.type !== ChannelType.GuildText)
                    return false;
                const perms = c.permissionsFor(me);
                return (perms?.has(PermissionsBitField.Flags.ViewChannel) &&
                    perms?.has(PermissionsBitField.Flags.ReadMessageHistory) &&
                    perms?.has(PermissionsBitField.Flags.ManageMessages));
            });
            for (const [, channel] of channels) {
                const textChannel = channel;
                try {
                    // Fetch up to 100 recent messages
                    const fetched = await textChannel.messages.fetch({ limit: 100 }).catch(() => null);
                    if (!fetched || fetched.size === 0)
                        continue;
                    // Filter eligible non-bot messages under 14 days old
                    const eligibleMessages = fetched.filter((m) => !m.author.bot && !m.system && m.createdTimestamp > fourteenDaysAgo);
                    if (eligibleMessages.size === 0)
                        continue;
                    // Group eligible messages by author ID
                    const userMessagesMap = new Map();
                    for (const msg of eligibleMessages.values()) {
                        const list = userMessagesMap.get(msg.author.id) || [];
                        list.push(msg);
                        userMessagesMap.set(msg.author.id, list);
                    }
                    const spamIdsToDelete = new Set();
                    for (const [, msgs] of userMessagesMap.entries()) {
                        // Sort chronologically (oldest to newest)
                        msgs.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                        // 1. Detect consecutive duplicate text clusters (e.g. repeated "Hi", identical phrases)
                        let duplicateCluster = [];
                        for (let i = 0; i < msgs.length; i++) {
                            const current = msgs[i];
                            const normalized = current.content.trim().toLowerCase();
                            if (duplicateCluster.length === 0) {
                                duplicateCluster.push(current);
                            }
                            else {
                                const prev = duplicateCluster[duplicateCluster.length - 1];
                                const prevNormalized = prev.content.trim().toLowerCase();
                                const interval = current.createdTimestamp - prev.createdTimestamp;
                                // Same text and sent within 30s of previous duplicate
                                if (normalized === prevNormalized && normalized.length > 0 && interval <= 30_000) {
                                    duplicateCluster.push(current);
                                }
                                else {
                                    // If cluster had 2+ duplicate messages, mark them as spam
                                    if (duplicateCluster.length >= 2) {
                                        duplicateCluster.forEach((m) => spamIdsToDelete.add(m.id));
                                    }
                                    duplicateCluster = [current];
                                }
                            }
                        }
                        if (duplicateCluster.length >= 2) {
                            duplicateCluster.forEach((m) => spamIdsToDelete.add(m.id));
                        }
                        // 2. Detect rapid flood bursts (4+ messages where each interval is <= 4 seconds)
                        let burstCluster = [];
                        for (let i = 0; i < msgs.length; i++) {
                            const current = msgs[i];
                            if (burstCluster.length === 0) {
                                burstCluster.push(current);
                            }
                            else {
                                const prev = burstCluster[burstCluster.length - 1];
                                const interval = current.createdTimestamp - prev.createdTimestamp;
                                if (interval <= 4_000) {
                                    burstCluster.push(current);
                                }
                                else {
                                    if (burstCluster.length >= 4) {
                                        burstCluster.forEach((m) => spamIdsToDelete.add(m.id));
                                    }
                                    burstCluster = [current];
                                }
                            }
                        }
                        if (burstCluster.length >= 4) {
                            burstCluster.forEach((m) => spamIdsToDelete.add(m.id));
                        }
                    }
                    if (spamIdsToDelete.size > 0) {
                        const idsArray = Array.from(spamIdsToDelete);
                        const deleted = await textChannel.bulkDelete(idsArray, true).catch(() => null);
                        const deletedCount = deleted?.size ?? 0;
                        if (deletedCount > 0) {
                            totalPurgedAcrossGuilds += deletedCount;
                            consoleLog('info', 'startup_cleaner', `Purged ${deletedCount} spam message(s) from #${textChannel.name} in guild '${guild.name}'`);
                            logAuditAction({
                                guild,
                                action: 'Startup Auto-Clean | Spam Purged',
                                executor: 'Hawk Startup Cleaner',
                                channelName: textChannel.name,
                                details: [
                                    `• **Channel:** #${textChannel.name}`,
                                    `• **Messages Purged:** ${deletedCount}`,
                                    `• **Reason:** Initial startup cleanup of historical spam clusters`,
                                ],
                            });
                        }
                    }
                    // Small delay between channels to respect REST rate limits
                    await new Promise((r) => setTimeout(r, 250));
                }
                catch (chanErr) {
                    consoleLog('warning', 'startup_cleaner', `Channel scan error in #${textChannel.name} (${guild.name}): ${chanErr instanceof Error ? chanErr.message : String(chanErr)}`);
                }
            }
        }
        catch (guildErr) {
            consoleLog('warning', 'startup_cleaner', `Guild scan error in ${guild.name}: ${guildErr instanceof Error ? guildErr.message : String(guildErr)}`);
        }
    }
    consoleLog('info', 'startup_cleaner', `Startup spam cleanup scan finished. Total spam messages purged: ${totalPurgedAcrossGuilds}`);
    logEvent('info', 'startup', `Startup spam cleanup completed: ${totalPurgedAcrossGuilds} messages purged across guilds.`);
}
//# sourceMappingURL=_startupSpamCleaner.js.map