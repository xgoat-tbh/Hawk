import { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import { setState } from '../../core/interactions/InteractionState.js';
import { ui } from '../../core/ui/index.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
function extractAllCustomEmojis(text) {
    const customEmojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d{17,20})>/g;
    const matches = Array.from(text.matchAll(customEmojiRegex));
    return matches.map(match => {
        const isAnimated = Boolean(match[1]);
        const emojiName = match[2];
        const emojiId = match[3];
        const mediaUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?quality=lossless`;
        return { mediaUrl, defaultName: emojiName };
    });
}
function extractMediaFromText(text) {
    if (!text)
        return null;
    // 1. Single Custom Emoji: <a:name:id> or <:name:id>
    const customEmojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d{17,20})>/;
    const emojiMatch = customEmojiRegex.exec(text);
    if (emojiMatch) {
        const isAnimated = Boolean(emojiMatch[1]);
        const emojiName = emojiMatch[2];
        const emojiId = emojiMatch[3];
        const mediaUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?quality=lossless`;
        return { mediaUrl, defaultName: emojiName };
    }
    // 2. Direct Discord Emoji CDN link
    const discordEmojiCdnRegex = /(?:https?:\/\/)?(?:cdn|media)\.discordapp\.(?:com|net)\/emojis\/(\d{17,20})\.(png|gif|webp|jpg|jpeg)(?:\?[^\s)]*)?/i;
    const cdnEmojiMatch = discordEmojiCdnRegex.exec(text);
    if (cdnEmojiMatch) {
        const emojiId = cdnEmojiMatch[1];
        const ext = cdnEmojiMatch[2].toLowerCase() === 'gif' ? 'gif' : 'png';
        const mediaUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?quality=lossless`;
        return { mediaUrl, defaultName: `emoji_${emojiId.slice(-6)}` };
    }
    // 3. Direct Discord Sticker CDN link
    const discordStickerCdnRegex = /(?:https?:\/\/)?(?:cdn|media)\.discordapp\.(?:com|net)\/stickers\/(\d{17,20})\.(png|webp|gif|json)(?:\?[^\s)]*)?/i;
    const cdnStickerMatch = discordStickerCdnRegex.exec(text);
    if (cdnStickerMatch) {
        const stickerId = cdnStickerMatch[1];
        const mediaUrl = `https://cdn.discordapp.com/stickers/${stickerId}.png`;
        return { mediaUrl, defaultName: `sticker_${stickerId.slice(-6)}` };
    }
    // 4. Discord Attachment CDN link
    const discordAttachmentRegex = /(https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\/\d+\/\d+\/[^\s)]+)/i;
    const attachmentMatch = discordAttachmentRegex.exec(text);
    if (attachmentMatch) {
        const mediaUrl = attachmentMatch[1];
        const cleanUrl = mediaUrl.split('?')[0];
        const urlParts = cleanUrl.split('/');
        const rawFilename = urlParts[urlParts.length - 1].split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        const defaultName = rawFilename.length >= 2 ? rawFilename : 'stolen_media';
        return { mediaUrl, defaultName };
    }
    // 5. Masked Markdown Link: [text](https://url)
    const maskedLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
    const maskedMatch = maskedLinkRegex.exec(text);
    if (maskedMatch) {
        const rawText = maskedMatch[1].trim().replace(/[^a-zA-Z0-9_]/g, '_');
        const mediaUrl = maskedMatch[2];
        const defaultName = rawText.length >= 2 ? rawText : 'stolen_media';
        return { mediaUrl, defaultName };
    }
    // 6. Generic Raw Image URL
    const rawUrlRegex = /https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?[^\s]*)?/i;
    const urlMatch = rawUrlRegex.exec(text);
    if (urlMatch) {
        const mediaUrl = urlMatch[0];
        const cleanUrl = mediaUrl.split('?')[0];
        const urlParts = cleanUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        const defaultName = filename.length >= 2 ? filename : 'stolen_media';
        return { mediaUrl, defaultName };
    }
    return null;
}
export default defineCommand({
    name: 'steal',
    aliases: ['stealemoji', 'stealsticker', 'addemoji'],
    module: 'general',
    description: 'Steal custom emojis, stickers, images, or links and add them to server emojis.',
    usage: 'steal [emoji(s)|url] [name] OR reply with steal [name]',
    examples: ['steal :custom_emoji:', 'steal :emoji1: :emoji2: :emoji3:', 'steal https://example.com/image.png my_emoji'],
    permissions: [PermissionsBitField.Flags.ManageGuildExpressions],
    botPermissions: [PermissionsBitField.Flags.ManageGuildExpressions, PermissionsBitField.Flags.SendMessages],
    cooldown: 3,
    async execute(ctx) {
        const { parsed, guild, member, respond, message, channel } = ctx;
        // Check for multi-emoji direct batch addition first
        const multiEmojis = extractAllCustomEmojis(message.content);
        if (multiEmojis.length > 1) {
            await message.delete().catch(() => { });
            const uploadedNames = [];
            const failedNames = [];
            for (const item of multiEmojis) {
                try {
                    const created = await guild.emojis.create({
                        attachment: item.mediaUrl,
                        name: item.defaultName,
                        reason: `Batch emoji steal by ${member.user.tag}`,
                    });
                    uploadedNames.push(created.name);
                }
                catch {
                    failedNames.push(item.defaultName);
                }
            }
            if (uploadedNames.length > 0) {
                const resultText = `Added **${uploadedNames.length}** emoji(s): ${uploadedNames.map(n => `\`:${n}:\``).join(' ')}${failedNames.length > 0 ? ` (Failed: ${failedNames.join(', ')})` : ''} • *(Auto-deleting in 5s)*`;
                await respond.transientSuccess(resultText, 5000);
                logAuditAction({
                    guild,
                    action: 'Batch Emojis Steal/Added',
                    executor: member,
                    details: [
                        `• **Added Emojis:** ${uploadedNames.map(n => `:${n}:`).join(', ')}`,
                        ...(failedNames.length > 0 ? [`• **Failed:** ${failedNames.join(', ')}`] : []),
                    ],
                });
            }
            else {
                await respond.error(`Failed to add ${failedNames.length} emojis (server slots full or invalid permissions).`);
            }
            return;
        }
        let media = null;
        let customNameOverride = null;
        // Check replied message first
        let referencedMsg = null;
        if (message.reference?.messageId) {
            referencedMsg = await channel.messages.fetch(message.reference.messageId).catch(() => null);
        }
        if (referencedMsg) {
            // Check stickers
            const sticker = referencedMsg.stickers.first();
            if (sticker) {
                media = {
                    mediaUrl: sticker.url || `https://cdn.discordapp.com/stickers/${sticker.id}.png`,
                    defaultName: sticker.name.replace(/[^a-zA-Z0-9_]/g, '_'),
                };
            }
            // Check attachments
            if (!media && referencedMsg.attachments.size > 0) {
                const att = referencedMsg.attachments.first();
                if (att.contentType?.startsWith('image/') || att.url.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
                    const rawName = att.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_');
                    media = {
                        mediaUrl: att.url,
                        defaultName: rawName.length >= 2 ? rawName : 'stolen_media',
                    };
                }
            }
            // Check text in referenced message
            if (!media && referencedMsg.content) {
                media = extractMediaFromText(referencedMsg.content);
            }
        }
        // Check command invocation attachments / text if not found in reference
        if (!media && message.attachments.size > 0) {
            const att = message.attachments.first();
            if (att.contentType?.startsWith('image/') || att.url.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
                const rawName = att.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_');
                media = {
                    mediaUrl: att.url,
                    defaultName: rawName.length >= 2 ? rawName : 'stolen_media',
                };
            }
        }
        if (!media && parsed.args.length > 0) {
            media = extractMediaFromText(message.content);
        }
        if (!media) {
            await respond.error('Could not find any emoji, sticker, attachment, image URL, or link to steal.');
            return;
        }
        // Check for custom name argument override
        if (parsed.args.length > 0) {
            const lastArg = parsed.args[parsed.args.length - 1];
            if (!lastArg.startsWith('http') && !lastArg.startsWith('<') && !lastArg.includes('[')) {
                customNameOverride = lastArg.replace(/[^a-zA-Z0-9_]/g, '_');
            }
        }
        const finalDefaultName = customNameOverride && customNameOverride.length >= 2 ? customNameOverride : media.defaultName;
        // Save interaction state
        const randomId = Math.random().toString(36).slice(2, 9);
        const stateKey = `steal_${randomId}`;
        setState(stateKey, member.id, {
            mediaUrl: media.mediaUrl,
            defaultName: finalDefaultName,
            invokerId: member.id,
            guildId: guild.id,
        });
        // Build Container UI with 2 buttons
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
            .setCustomId(`steal_btn_emoji_${randomId}`)
            .setLabel('Add as Emoji')
            .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
            .setCustomId(`steal_btn_sticker_${randomId}`)
            .setLabel('Add as Sticker')
            .setStyle(ButtonStyle.Secondary));
        const payload = ui.standard({
            title: 'Steal Emoji / Sticker',
            text: `• Target Media: [View Image](${media.mediaUrl})\n• Suggested Name: \`${finalDefaultName}\`\n\nTap a button below to add this as a Server Emoji or Sticker:`,
            components: [row],
        });
        // Auto-delete the invoking command message
        await message.delete().catch(() => { });
        const promptMsg = await channel.send(payload);
        // Auto-delete steal prompt after 60s if abandoned
        setTimeout(() => {
            promptMsg.delete().catch(() => { });
        }, 60_000);
    },
});
//# sourceMappingURL=steal.js.map