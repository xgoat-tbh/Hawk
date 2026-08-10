import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'tickle',
  aliases: ['tickles'],
  emoji: '🪶',
  verb: 'tickled',
  sendbackLabel: 'Tickle Back! 🪶',
  description: 'Tickle someone until they laugh.',
});
