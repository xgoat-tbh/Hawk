import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
  TextChannel,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { getEmoji, branding } from '../../core/config/branding.js';

function resolveGuideImagePath(): string | null {
  const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
  const candidates = [
    path.join(currentDir, 'assets', 'pvc_guide.png'),
    path.join(process.cwd(), 'src', 'modules', 'pvc', 'assets', 'pvc_guide.png'),
    path.join(process.cwd(), 'dist', 'modules', 'pvc', 'assets', 'pvc_guide.png'),
    path.join(process.cwd(), 'assets', 'pvc_guide.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

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
    .setFooter({ text: 'Use the buttons below to use the interface' })
    .setColor(branding.defaultColor ?? 0x2b2d31);

  const files: AttachmentBuilder[] = [];
  const imagePath = resolveGuideImagePath();
  if (imagePath) {
    embed.setImage('attachment://pvc_guide.png');
    files.push(new AttachmentBuilder(imagePath, { name: 'pvc_guide.png' }));
  }

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

  return {
    embeds: [embed],
    components: [row1, row2, row3],
    files,
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
