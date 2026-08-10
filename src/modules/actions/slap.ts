import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'slap',
  aliases: ['slaps'],
  emoji: '🖐️',
  verb: 'slapped',
  sendbackLabel: 'Slap Back! 🖐️',
  description: 'Slap someone across the face.',
});
