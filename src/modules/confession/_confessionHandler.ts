import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  GuildTextBasedChannel,
  Message,
  Client,
} from 'discord.js';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';
import {
  getConfessionChannel,
  getConfessionConfig,
  setConfessionPanelMessageId,
  getAllConfessionConfigs,
  createConfessionRecord,
} from '../../core/database/repositories/confessionRepo.js';
import { buildAnonymousConfessionEmbed, buildConfessionPanel } from './confessionUI.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

const activeConfessionPanels = new Map<string, string>(); // guildId -> messageId
const confessionPanelChannels = new Set<string>(); // channelId
const confessionPanelLocks = new Set<string>(); // channelId

export function registerConfessionPanelChannel(channelId: string): void {
  confessionPanelChannels.add(channelId);
}

export async function handleConfessionButton(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild } = interaction;
  if (!guild || interaction.replied || interaction.deferred) return;

  if (customId === 'confess_info') {
    await interaction.reply({
      content:
        'ℹ️ **Anonymous Confessions Info**\n\n' +
        '• Your confession is posted **100% anonymously** to the public channel.\n' +
        '• Your username, avatar, and ID are **never** displayed or attached to the public post.\n' +
        '• Respect server rules and Discord Terms of Service.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId === 'confess_open_modal') {
    const channelId = await getConfessionChannel(guild.id);
    if (!channelId) {
      await interaction.reply({ content: 'Confessions are not configured for this server yet.', flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('confess_modal_submit')
      .setTitle('Submit Anonymous Confession')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('confession_content')
            .setLabel('Your Confession')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your anonymous confession here...')
            .setRequired(true)
            .setMaxLength(2000),
        ),
      );

    await interaction.showModal(modal);
  }
}

export async function handleConfessionModal(interaction: ModalSubmitInteraction): Promise<void> {
  const { customId, guild, user } = interaction;
  if (!guild || interaction.replied || interaction.deferred) return;

  if (customId !== 'confess_modal_submit') return;

  const channelId = await getConfessionChannel(guild.id);
  if (!channelId) {
    await interaction.reply({ content: 'Confessions are not configured for this server yet.', flags: MessageFlags.Ephemeral });
    return;
  }

  const targetChannel = (await guild.channels.fetch(channelId).catch(() => null)) as GuildTextBasedChannel | null;
  if (!targetChannel) {
    await interaction.reply({ content: 'Configured confession channel no longer exists. Please notify an administrator.', flags: MessageFlags.Ephemeral });
    return;
  }

  const content = interaction.fields.getTextInputValue('confession_content').trim();
  if (!content) {
    await interaction.reply({ content: 'Confession content cannot be empty.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  while (confessionPanelLocks.has(channelId)) {
    await new Promise(r => setTimeout(r, 100));
  }
  confessionPanelLocks.add(channelId);

  try {
    // 1. Delete previous confession panel message FIRST
    const config = await getConfessionConfig(guild.id);
    if (config && config.panelMessageId) {
      const prevMsg = await targetChannel.messages.fetch(config.panelMessageId).catch(() => null);
      if (prevMsg) {
        await prevMsg.delete().catch(() => {});
      }
    }

    // 2. Post user's anonymous confession message
    const embed = buildAnonymousConfessionEmbed(content);
    const postedMsg = await targetChannel.send({
      embeds: [embed],
      allowedMentions: {
        parse: [],
        roles: [],
        users: [],
      },
    });

    // 3. Store internal record for auditing
    const record = await createConfessionRecord(guild.id, user.id, content, targetChannel.id, postedMsg.id);

    // 4. Post NEW confession panel message below it
    const panelPayload = buildConfessionPanel();
    const newPanelMsg = await targetChannel.send(panelPayload);

    // 5. Track new panel message ID in DB and memory
    activeConfessionPanels.set(guild.id, newPanelMsg.id);
    await setConfessionPanelMessageId(guild.id, newPanelMsg.id);

    // Private developer logging
    logEvent('info', 'command_execution', `Anonymous confession #${record.id} submitted by ${user.tag}`, {
      user: user.tag,
      userId: user.id,
      guild: guild.name,
      guildId: guild.id,
      confessionId: record.id,
      channelId: targetChannel.id,
      messageId: postedMsg.id,
      content,
    });

    await interaction.editReply({ content: 'Your confession has been submitted anonymously.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    consoleLog('error', 'command_failure', `Failed to process confession for ${user.id}`, { error: msg });
    await interaction.editReply({ content: 'Could not post confession. Please try again later.' });
  } finally {
    confessionPanelLocks.delete(channelId);
  }
}

export async function handleConfessionPanelResurface(_message: Message): Promise<void> {
  // Automatic resurfacing disabled per simple modal submission replacement flow
}

export async function initializeConfessionPanels(client: Client): Promise<void> {
  try {
    const configs = await getAllConfessionConfigs();
    confessionPanelChannels.clear();
    for (const conf of configs) {
      if (!conf.channelId) continue;
      confessionPanelChannels.add(conf.channelId);
      const channel = (await client.channels.fetch(conf.channelId).catch(() => null)) as GuildTextBasedChannel | null;
      if (!channel) continue;

      let validMessageExists = false;
      if (conf.panelMessageId) {
        const existingMsg = await channel.messages.fetch(conf.panelMessageId).catch(() => null);
        if (existingMsg) {
          validMessageExists = true;
          activeConfessionPanels.set(conf.guildId, existingMsg.id);
        }
      }

      if (!validMessageExists) {
        const panel = buildConfessionPanel();
        const newMsg = await channel.send(panel);
        activeConfessionPanels.set(conf.guildId, newMsg.id);
        await setConfessionPanelMessageId(conf.guildId, newMsg.id);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    consoleLog('error', 'startup', 'Failed to initialize confession panels on startup', { error: msg });
  }
}
