import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'bite',
  aliases: ['bites', 'nom'],
  emoji: '🦷',
  verb: 'bit',
  sendbackLabel: 'Bite Back! 🦷',
  description: 'Playfully bite someone.',
});
