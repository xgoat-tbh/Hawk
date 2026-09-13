import { ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { ui } from '../../core/ui/index.js';
import { getEmoji } from '../../core/config/branding.js';

function buildPvcButton(customId: string, label: string, emojiKey: string): ButtonBuilder {
  const btn = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);
  const emoji = getEmoji(emojiKey);
  if (emoji) {
    btn.setEmoji(emoji);
  }
  return btn;
}

export function buildMasterPanel(): { components: any[]; flags?: any } {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buildPvcButton('btn_master_add_hours', 'Add', 'pvc_btn_add'),
    buildPvcButton('btn_master_fastag', 'Autopay', 'pvc_btn_autopay'),
    buildPvcButton('btn_master_limit', 'Limit', 'pvc_btn_limit'),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buildPvcButton('btn_master_trust', 'Trust', 'pvc_btn_trust'),
    buildPvcButton('btn_master_rename', 'Rename', 'pvc_btn_rename'),
    buildPvcButton('btn_master_info', 'Info', 'pvc_btn_info'),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buildPvcButton('btn_master_transfer', 'Transfer', 'pvc_btn_transfer'),
    buildPvcButton('btn_master_privacy', 'Privacy', 'pvc_btn_privacy'),
    buildPvcButton('btn_master_remove_user', 'Remove', 'pvc_btn_remove'),
  );

  const payload = ui.standard({
    title: 'PVC Panel',
    text: 'Use the buttons below to manage your PVC.',
    components: [row1, row2, row3],
  });

  return { components: payload.components, flags: payload.flags as any };
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
