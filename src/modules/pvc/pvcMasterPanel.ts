import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';

export function buildMasterPanel(): { embeds: EmbedBuilder[]; components: ActionRowBuilder<any>[] } {
  const embed = new EmbedBuilder()
    .setTitle('Private Voice Channel Control Panel')
    .setDescription('Manage your Private Voice Channel using the buttons below.\n\nTo create a PVC, join the designated "Join to Create" channel. If you don\'t have active time, use `!pvc buy <hours>`.')
    .setColor('#5865F2');

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_master_info').setLabel('Info').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_master_add_user').setLabel('Add User').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_master_remove_user').setLabel('Remove User').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_master_hide').setLabel('Hide/Unhide').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_master_friends').setLabel('Friends').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_master_fastag').setLabel('FASTag').setStyle(ButtonStyle.Success)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_master_transfer').setLabel('Transfer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_master_delete').setLabel('Delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('btn_master_privacy').setLabel('Privacy').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2, row3] };
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
    } catch (e) {
      // Message not found, send new
    }
  }
  
  await channel.send(panel);
}
