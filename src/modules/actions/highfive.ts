import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'highfive',
  aliases: ['h5'],
  emoji: '✋',
  verb: 'high-fived',
  sendbackLabel: 'High Five Back! ✋',
  description: 'High five someone.',
});
