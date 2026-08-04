import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { WELCOME_VARIABLES_GUIDE } from './welcomeEngine.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';

export function buildWelcomeConfigPanel(type: 'greet' | 'leave'): ComponentV2Payload {
  const isGreet = type === 'greet';
  const title = isGreet ? '**👋 Welcome Greeting Configuration**' : '**🚪 Leave Message Configuration**';

  const body =
    `Choose how you would like to configure the **${isGreet ? 'Welcome' : 'Leave'}** message payload:\n\n` +
    '• **Simple Message**: Plain text message with variables.\n' +
    '• **Paste JSON**: Paste raw JSON payload (e.g. Discohook format with embeds).\n\n' +
    WELCOME_VARIABLES_GUIDE;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`welcome_simple_${type}`)
      .setLabel('Simple Message')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`welcome_json_${type}`)
      .setLabel('Paste JSON')
      .setEmoji('📦')
      .setStyle(ButtonStyle.Secondary),
  );

  return buildV2Container({
    text: title,
    sections: [body],
    components: [row],
  });
}
