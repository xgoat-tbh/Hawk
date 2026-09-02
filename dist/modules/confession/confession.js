import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import { resolveChannel } from '../../core/resolver/ChannelResolver.js';
import { setConfessionChannel, getConfessionChannel, setConfessionLogChannel, getConfessionLogChannel, setConfessionPanelMessageId, getConfessionConfig, getConfessionRecordsForGuild, updateConfessionMessageId, resetConfessionDataForGuild, } from '../../core/database/repositories/confessionRepo.js';
import { buildConfessionPanel, buildAnonymousConfessionPayload } from './confessionUI.js';
import { registerConfessionPanelChannel } from './_confessionHandler.js';
import { mentionChannel, bold } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
export default defineCommand({
    name: 'confession',
    module: 'confession',
    description: 'Manage Confession module channel, log channel, submission panel, repair/repost clean confessions, or perform a reset.',
    usage: 'confession <channel|log|panel|fix|reset> [args...]',
    examples: [
        'confession channel #confessions',
        'confession log #mod-logs',
        'confession log none',
        'confession panel',
        'confession fix',
        'confession fix repost',
        'confession reset confirm',
    ],
    permissions: [PermissionsBitField.Flags.ManageGuild],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const { parsed, respond } = ctx;
        if (parsed.args.length === 0) {
            await respond.error('Specify a subcommand: `channel`, `log`, `panel`, `fix`, or `reset`.');
            return;
        }
        const subcommand = parsed.args[0].toLowerCase();
        const subArgs = parsed.args.slice(1);
        switch (subcommand) {
            case 'channel':
                await handleChannelConfig(ctx, subArgs);
                break;
            case 'log':
            case 'logchannel':
            case 'logs':
            case 'modlog':
                await handleLogConfig(ctx, subArgs);
                break;
            case 'panel':
            case 'sendpanel':
                await handlePanel(ctx);
                break;
            case 'fix':
            case 'repair':
            case 'repost':
            case 'clean':
                await handleFix(ctx, subArgs);
                break;
            case 'reset':
            case 'nuke':
                await handleReset(ctx, subArgs);
                break;
            default:
                await respond.error(`Unknown subcommand \`${subcommand}\`. Valid options: \`channel\`, \`log\`, \`panel\`, \`fix\`, \`reset\`.`);
                break;
        }
    },
});
async function handleChannelConfig(ctx, args) {
    const { guild, respond, member } = ctx;
    if (args.length === 0) {
        const current = await getConfessionChannel(guild.id);
        const prefix = ctx.parsed.prefix;
        if (current) {
            await respond.info(`The current confession channel is ${mentionChannel(current)}.`);
        }
        else {
            await respond.info(`No confession channel has been configured yet. Use \`${prefix}confession channel <#channel>\`.`);
        }
        return;
    }
    const channelResult = resolveChannel(args[0], guild);
    if (!channelResult.success) {
        await respond.error(`Channel: ${channelResult.error}`);
        return;
    }
    const channel = channelResult.value.channel;
    if (!channel.isTextBased()) {
        await respond.error('The confession channel must be a text-based channel.');
        return;
    }
    const prevChannel = await getConfessionChannel(guild.id);
    await setConfessionChannel(guild.id, channel.id);
    registerConfessionPanelChannel(channel.id);
    await respond.success(`Confession destination channel configured to ${mentionChannel(channel.id)}.`);
    logEvent('info', 'command_execution', `Confession channel configured by ${member.user.tag}`, {
        administrator: member.user.tag,
        adminId: member.id,
        guild: guild.name,
        guildId: guild.id,
        previousChannel: prevChannel ?? 'none',
        newChannel: channel.id,
    });
}
async function handleLogConfig(ctx, args) {
    const { guild, respond, member } = ctx;
    if (args.length === 0) {
        const current = await getConfessionLogChannel(guild.id);
        const prefix = ctx.parsed.prefix;
        if (current) {
            await respond.info(`The current confession log channel is ${mentionChannel(current)}.`);
        }
        else {
            await respond.info(`No confession log channel is currently configured. Use \`${prefix}confession log <#channel>\`.`);
        }
        return;
    }
    const input = args[0].toLowerCase();
    if (['none', 'off', 'disable', 'delete', 'remove', 'clear'].includes(input)) {
        await setConfessionLogChannel(guild.id, null);
        await respond.success('Confession log channel configuration removed.');
        return;
    }
    const channelResult = resolveChannel(args[0], guild);
    if (!channelResult.success) {
        await respond.error(`Channel: ${channelResult.error}`);
        return;
    }
    const channel = channelResult.value.channel;
    if (!channel.isTextBased()) {
        await respond.error('The confession log channel must be a text-based channel.');
        return;
    }
    await setConfessionLogChannel(guild.id, channel.id);
    await respond.success(`Confession log channel configured to ${mentionChannel(channel.id)}.`);
    logEvent('info', 'command_execution', `Confession log channel configured by ${member.user.tag}`, {
        administrator: member.user.tag,
        adminId: member.id,
        guild: guild.name,
        guildId: guild.id,
        logChannel: channel.id,
    });
}
async function handlePanel(ctx) {
    const { channel, respond, member, guild } = ctx;
    const textChannel = channel;
    const panel = buildConfessionPanel();
    const panelMsg = await textChannel.send({
        components: panel.components,
        flags: panel.flags,
        allowedMentions: { parse: [], roles: [], users: [] },
    });
    await setConfessionPanelMessageId(guild.id, panelMsg.id);
    await respond.success('Confession submission panel has been posted.');
    logEvent('info', 'command_execution', `Confession panel posted by ${member.user.tag}`, {
        administrator: member.user.tag,
        adminId: member.id,
        guild: guild.name,
        guildId: guild.id,
        channel: channel.name,
    });
}
async function handleFix(ctx, args) {
    const { guild, respond, member } = ctx;
    const isRepost = args[0]?.toLowerCase() === 'repost';
    const channelId = await getConfessionChannel(guild.id);
    if (!channelId) {
        await respond.error('No confession channel has been configured for this server. Use `!confession channel <#channel>` first.');
        return;
    }
    const confessionChannel = (guild.channels.cache.get(channelId) ??
        (await guild.channels.fetch(channelId).catch(() => null)));
    if (!confessionChannel || !('send' in confessionChannel)) {
        await respond.error(`Configured confession channel ${mentionChannel(channelId)} could not be reached.`);
        return;
    }
    const records = await getConfessionRecordsForGuild(guild.id);
    const config = await getConfessionConfig(guild.id);
    let updatedCount = 0;
    let repostedCount = 0;
    let failedCount = 0;
    if (isRepost) {
        // Repost mode: purge bot's existing messages in the channel and repost clean confessions sequentially
        const fetched = await confessionChannel.messages.fetch({ limit: 100 }).catch(() => null);
        if (fetched) {
            const botMessages = fetched.filter(m => m.author.id === ctx.message.client.user.id);
            for (const msg of botMessages.values()) {
                await msg.delete().catch(() => { });
            }
        }
        for (const rec of records) {
            try {
                const payload = buildAnonymousConfessionPayload(rec.content);
                const sent = await confessionChannel.send({
                    components: payload.components,
                    flags: payload.flags,
                    allowedMentions: { parse: [], roles: [], users: [] },
                });
                await updateConfessionMessageId(rec.id, sent.id);
                repostedCount++;
            }
            catch {
                failedCount++;
            }
        }
        // Post fresh non-emoji panel at the bottom
        const panelPayload = buildConfessionPanel();
        const newPanelMsg = await confessionChannel.send({
            components: panelPayload.components,
            flags: panelPayload.flags,
            allowedMentions: { parse: [], roles: [], users: [] },
        });
        await setConfessionPanelMessageId(guild.id, newPanelMsg.id);
    }
    else {
        // In-place fix mode: edit all tracked confession messages and the panel in-place to strip emojis
        for (const rec of records) {
            try {
                if (!rec.messageId) {
                    failedCount++;
                    continue;
                }
                const existingMsg = await confessionChannel.messages.fetch(rec.messageId).catch(() => null);
                if (existingMsg) {
                    const payload = buildAnonymousConfessionPayload(rec.content);
                    await existingMsg.edit({
                        components: payload.components,
                        flags: payload.flags,
                        allowedMentions: { parse: [], roles: [], users: [] },
                    });
                    updatedCount++;
                }
                else {
                    // If message is missing, repost it
                    const payload = buildAnonymousConfessionPayload(rec.content);
                    const sent = await confessionChannel.send({
                        components: payload.components,
                        flags: payload.flags,
                        allowedMentions: { parse: [], roles: [], users: [] },
                    });
                    await updateConfessionMessageId(rec.id, sent.id);
                    repostedCount++;
                }
            }
            catch {
                failedCount++;
            }
        }
        // Fix or recreate panel
        let panelFixed = false;
        if (config?.panelMessageId) {
            const panelMsg = await confessionChannel.messages.fetch(config.panelMessageId).catch(() => null);
            if (panelMsg) {
                const panelPayload = buildConfessionPanel();
                await panelMsg.edit({
                    components: panelPayload.components,
                    flags: panelPayload.flags,
                    allowedMentions: { parse: [], roles: [], users: [] },
                });
                panelFixed = true;
            }
        }
        if (!panelFixed) {
            const panelPayload = buildConfessionPanel();
            const newPanelMsg = await confessionChannel.send({
                components: panelPayload.components,
                flags: panelPayload.flags,
                allowedMentions: { parse: [], roles: [], users: [] },
            });
            await setConfessionPanelMessageId(guild.id, newPanelMsg.id);
        }
    }
    const resultSummary = isRepost
        ? `Reposted **${repostedCount} confession(s)** and refreshed submission panel in ${mentionChannel(channelId)} with clean non-emoji format.`
        : `Fixed and updated **${updatedCount} confession message(s)**${repostedCount > 0 ? `, reposted **${repostedCount}**` : ''} and refreshed submission panel in ${mentionChannel(channelId)} with clean non-emoji format.`;
    await respond.success(resultSummary);
    logEvent('info', 'command_execution', `Confession channel fixed by ${member.user.tag}`, {
        administrator: member.user.tag,
        adminId: member.id,
        guild: guild.name,
        guildId: guild.id,
        channelId,
        mode: isRepost ? 'repost' : 'edit',
        updatedCount,
        repostedCount,
        failedCount,
    });
}
async function handleReset(ctx, args) {
    const { guild, respond, member } = ctx;
    if (args.length === 0 || args[0].toLowerCase() !== 'confirm') {
        const prefix = ctx.parsed.prefix;
        await respond.warning(`${bold('DESTRUCTIVE OPERATION')}: Resetting confessions will delete all confession records and channel configuration for this server.\n\nTo confirm, run: \`${prefix}confession reset confirm\``);
        return;
    }
    await resetConfessionDataForGuild(guild.id);
    await respond.success('Confession module data has been completely reset for this server.');
    logEvent('warning', 'command_execution', `Confession data reset for ${guild.name} by ${member.user.tag}`, {
        administrator: member.user.tag,
        adminId: member.id,
        guild: guild.name,
        guildId: guild.id,
        operation: 'reset',
    });
}
//# sourceMappingURL=confession.js.map