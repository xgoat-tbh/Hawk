import { createActionCommand } from './actionEngine.js';

export default createActionCommand({
  name: 'holdhands',
  aliases: ['handhold', 'handholding'],
  emoji: '🤝',
  verb: 'held hands with',
  sendbackLabel: 'Hold Hands Back! 🤝',
  description: 'Hold hands intimately with someone.',
});
