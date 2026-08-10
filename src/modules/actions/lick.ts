import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'lick',
  aliases: ['licks'],
  emoji: '👅',
  verb: 'licked',
  sendbackLabel: 'Lick Back! 👅',
  description: 'Lick someone playfully.',
});
