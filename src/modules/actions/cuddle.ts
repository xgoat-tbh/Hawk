import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'cuddle',
  aliases: ['cuddles', 'snuggle'],
  emoji: '🫂',
  verb: 'cuddled',
  sendbackLabel: 'Cuddle Back! 🫂',
  description: 'Cuddle up close with someone.',
});
