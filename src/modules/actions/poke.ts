import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'poke',
  aliases: ['pokes'],
  emoji: '👉',
  verb: 'poked',
  sendbackLabel: 'Poke Back! 👉',
  description: 'Poke someone to get their attention.',
});
