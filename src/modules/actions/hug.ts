import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'hug',
  aliases: ['hugs'],
  emoji: '🤗',
  verb: 'hugged',
  sendbackLabel: 'Hug Back! 🤗',
  description: 'Give someone a warm anime hug.',
});
