import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
  TextChannel,
} from 'discord.js';
import path from 'node:path';
import url from 'node:url';
import { getEmoji, branding } from '../../core/config/branding.js';

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
const GUIDE_IMAGE_PATH = path.join(currentDir, 'assets', 'pvc_guide.png');

function buildPvcButton(customId: string, emojiKey: string): ButtonBuilder {
  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setStyle(ButtonStyle.Secondary);
  const emoji = getEmoji(emojiKey);
  if (emoji) {
    btn.setEmoji(emoji);
  }
  return btn;
}

export function buildMasterPanel(): { embeds: any[]; components: any[]; files: any[] } {
  const embed = new EmbedBuilder()
    .setTitle('PVC Panel')
    .setDescription('Manage your temporary voice channel and its settings from the controls below.')
    .setImage('attachment://pvc_guide.png')
    .setFooter({ text: 'Use the buttons below to use the interface' })
    .setColor(branding.defaultColor ?? 0x2b2d31);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buildPvcButton('btn_master_add_hours', 'pvc_btn_add'),
    buildPvcButton('btn_master_fastag', 'pvc_btn_autopay'),
    buildPvcButton('btn_master_limit', 'pvc_btn_limit'),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buildPvcButton('btn_master_trust', 'pvc_btn_trust'),
    buildPvcButton('btn_master_rename', 'pvc_btn_rename'),
    buildPvcButton('btn_master_info', 'pvc_btn_info'),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buildPvcButton('btn_master_transfer', 'pvc_btn_transfer'),
    buildPvcButton('btn_master_privacy', 'pvc_btn_privacy'),
    buildPvcButton('btn_master_remove_user', 'pvc_btn_remove'),
  );

  const file = new AttachmentBuilder(GUIDE_IMAGE_PATH, { name: 'pvc_guide.png' });

  return {
    embeds: [embed],
    components: [row1, row2, row3],
    files: [file],
  };
}

export async function deployMasterPanel(channel: TextChannel, existingMsgId?: string): Promise<void> {
  const panel = buildMasterPanel();
  
  if (existingMsgId) {
    try {
      const msg = await channel.messages.fetch(existingMsgId);
      if (msg) {
        await msg.edit(panel);
        return;
      }
    } catch {
      // Message not found, send new
    }
  }
  
  await channel.send(panel);
}
