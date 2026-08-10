import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'kiss',
  aliases: ['kisses', 'smooch'],
  emoji: '💋',
  verb: 'kissed',
  sendbackLabel: 'Kiss Back! 💋',
  description: 'Give someone a sweet anime kiss.',
});
