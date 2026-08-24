import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { WELCOME_VARIABLES_GUIDE } from './welcomeEngine.js';
import { ui } from '../../core/ui/index.js';
export function buildWelcomeConfigPanel(type) {
    const isGreet = type === 'greet';
    const title = isGreet ? 'Welcome Greeting Configuration' : 'Leave Message Configuration';
    const body = `Choose how you would like to configure the **${isGreet ? 'Welcome' : 'Leave'}** message payload:\n\n` +
        '• **Simple Message**: Plain text message with variables.\n' +
        '• **Paste JSON**: Raw JSON payload with embed support.\n\n' +
        WELCOME_VARIABLES_GUIDE;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId(`welcome_simple_${type}`)
        .setLabel('Simple Message')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId(`welcome_json_${type}`)
        .setLabel('Paste JSON')
        .setStyle(ButtonStyle.Secondary));
    return ui.standard({
        title,
        text: body,
        components: [row],
    });
}
//# sourceMappingURL=welcomeUI.js.map