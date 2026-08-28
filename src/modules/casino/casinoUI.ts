import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { BlackjackGame } from './blackjackEngine.js';
import { handToString, handValue, isSoft, canSplit, canDoubleDown } from './blackjackEngine.js';

export function buildBlackjackEmbed(game: BlackjackGame, playerName: string, bet: number, currencySymbol: string = '$'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Blackjack - ${playerName}`)
    .setColor('#0099ff');
    
  let description = `**Bet:** ${currencySymbol}${bet}\n`;
  if (game.bets.length > 1) {
    description += `**Total Bet:** ${currencySymbol}${game.bets.reduce((a, b) => a + b, 0)} (Splits)\n`;
  }
  
  embed.setDescription(description);
  
  // Dealer Hand
  let dealerText = '';
  if (game.status === 'playing') {
    dealerText = handToString(game.dealerHand, true) + ' `?`';
  } else {
    dealerText = handToString(game.dealerHand) + ` \`${handValue(game.dealerHand)}${isSoft(game.dealerHand) ? ' Soft' : ''}\``;
  }
  embed.addFields({ name: 'Dealer', value: dealerText, inline: false });
  
  // Player Hands
  for (let i = 0; i < game.playerHands.length; i++) {
    const hand = game.playerHands[i];
    const val = handValue(hand);
    let handName = `Your Hand ${game.playerHands.length > 1 ? i + 1 : ''}`;
    if (game.status === 'playing' && i === game.activeHandIndex) {
      handName = `> ${handName}`;
    }
    
    let handText = handToString(hand) + ` \`${val}${isSoft(hand) ? ' Soft' : ''}\``;
    embed.addFields({ name: handName, value: handText, inline: false });
  }
  
  if (game.status !== 'playing') {
    embed.addFields({ name: 'Result', value: `Status: **${game.status.toUpperCase()}**`, inline: false });
  }
  
  return embed;
}

export function buildBlackjackButtons(game: BlackjackGame, guildId: string, userId: string): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  
  if (game.status !== 'playing') {
    return row;
  }
  
  const hand = game.playerHands[game.activeHandIndex];
  
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`bj_hit_${guildId}_${userId}`)
      .setLabel('Hit')
      .setStyle(ButtonStyle.Primary),
      
    new ButtonBuilder()
      .setCustomId(`bj_stand_${guildId}_${userId}`)
      .setLabel('Stand')
      .setStyle(ButtonStyle.Secondary)
  );
  
  if (canDoubleDown(hand)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`bj_double_${guildId}_${userId}`)
        .setLabel('Double Down')
        .setStyle(ButtonStyle.Success)
    );
  }
  
  if (canSplit(hand)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`bj_split_${guildId}_${userId}`)
        .setLabel('Split')
        .setStyle(ButtonStyle.Danger)
    );
  }
  
  return row;
}

export function buildRouletteEmbed(result: number, bet: any, won: boolean, payout: number, currencySymbol: string = '$'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Roulette')
    .setColor(won ? '#00ff00' : '#ff0000');
    
  embed.setDescription(`The ball landed on **${result}**!`);
  
  embed.addFields(
    { name: 'Your Bet', value: `${bet.type} ${bet.value !== undefined ? bet.value : ''}`, inline: true },
    { name: 'Result', value: won ? `You won **${currencySymbol}${payout}**!` : 'You lost your bet.', inline: true }
  );
  
  return embed;
}

export function buildSlotsEmbed(grid: string, won: boolean, payout: number, bet: number, currencySymbol: string = '$'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Slot Machine')
    .setColor(won ? '#FFD700' : '#808080');
    
  embed.setDescription(`\n\n**${grid}**\n\n`);
  
  if (won) {
    embed.addFields({ name: 'Winner!', value: `You won **${currencySymbol}${payout}**! (Bet: ${currencySymbol}${bet})` });
  } else {
    embed.addFields({ name: 'Lost', value: `Better luck next time. You lost ${currencySymbol}${bet}.` });
  }
  
  return embed;
}

export function buildCockfightEmbed(fight: any, bet: number, won: boolean, payout: number, currencySymbol: string = '$'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Cockfight')
    .setColor('#e74c3c');
    
  embed.setDescription(fight.summary);
  
  if (won) {
    embed.addFields({ name: 'Result', value: `Your rooster won! You earned **${currencySymbol}${payout}**!` });
  } else {
    embed.addFields({ name: 'Result', value: `Your rooster lost. You lost your bet of ${currencySymbol}${bet}.` });
  }
  
  return embed;
}

export function buildRussianRouletteEmbed(survived: boolean, payout: number, bet: number, currencySymbol: string = '$'): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Russian Roulette')
    .setColor(survived ? '#2ecc71' : '#000000');
    
  if (survived) {
    embed.setDescription(`*Click.* You survived!`);
    embed.addFields({ name: 'Payout', value: `You walk away with **${currencySymbol}${payout}**!` });
  } else {
    embed.setDescription(`*BANG!* You died.`);
    embed.addFields({ name: 'Loss', value: `You lost your bet of **${currencySymbol}${bet}** and your life.` });
  }
  
  return embed;
}
