import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'lappillow',
  aliases: ['lap'],
  emoji: '🦵',
  verb: 'gave a lap pillow to',
  sendbackLabel: 'Give Lap Pillow Back! 🦵',
  description: 'Offer someone a comfy anime lap pillow.',
});
