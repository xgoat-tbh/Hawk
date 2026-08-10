import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'wink',
  aliases: ['winks'],
  emoji: '😉',
  verb: 'winked at',
  sendbackLabel: 'Wink Back! 😉',
  description: 'Wink at someone playfully.',
});
