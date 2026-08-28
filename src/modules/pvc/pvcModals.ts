import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export function createRenameModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('pvc_modal_rename')
    .setTitle('Rename PVC');

  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel('New Channel Name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
  modal.addComponents(row);

  return modal;
}

export function createLimitModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('pvc_modal_limit')
    .setTitle('Set User Limit');

  const limitInput = new TextInputBuilder()
    .setCustomId('limit')
    .setLabel('Max Users (0 for unlimited)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(2);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);
  modal.addComponents(row);

  return modal;
}
