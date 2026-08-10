import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'blush',
  aliases: ['flush'],
  emoji: '😊',
  verb: 'is blushing!',
  sendbackLabel: '',
  description: 'Show that you are blushing.',
  selfOnly: true,
});
