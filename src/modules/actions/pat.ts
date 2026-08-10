import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'pat',
  aliases: ['pats', 'headpat'],
  emoji: '🫳',
  verb: 'patted',
  sendbackLabel: 'Pat Back! 🫳',
  description: 'Gently headpat someone.',
});
