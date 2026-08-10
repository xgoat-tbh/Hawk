import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'smile',
  aliases: ['smiles'],
  emoji: '😄',
  verb: 'smiled at',
  sendbackLabel: 'Smile Back! 😄',
  description: 'Smile warmly at someone.',
});
