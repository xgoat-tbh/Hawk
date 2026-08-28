export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card { suit: Suit; rank: Rank; }
export interface Hand { cards: Card[]; }
export type GameStatus = 'playing' | 'dealer_turn' | 'player_bust' | 'dealer_bust' | 'player_win' | 'dealer_win' | 'push' | 'blackjack';

export interface BlackjackGame {
  shoe: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Hand;
  status: GameStatus;
  bet: number;
  bets: number[]; // per hand for splits
}

export function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function createShoe(deckCount: number): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const shoe: Card[] = [];
  
  for (let d = 0; d < deckCount; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        shoe.push({ suit, rank });
      }
    }
  }
  
  shuffleArray(shoe);
  return shoe;
}

export function drawCard(shoe: Card[]): Card {
  if (shoe.length === 0) {
    const newShoe = createShoe(4);
    shoe.push(...newShoe);
  }
  return shoe.pop()!;
}

export function handValue(hand: Hand): number {
  let value = 0;
  let aces = 0;
  
  for (const card of hand.cards) {
    if (card.rank === 'A') {
      aces += 1;
      value += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank, 10);
    }
  }
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  
  return value;
}

export function isSoft(hand: Hand): boolean {
  let value = 0;
  let aces = 0;
  
  for (const card of hand.cards) {
    if (card.rank === 'A') {
      aces += 1;
      value += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank, 10);
    }
  }
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  
  let hardValue = 0;
  for (const card of hand.cards) {
    if (card.rank === 'A') hardValue += 1;
    else if (['K', 'Q', 'J'].includes(card.rank)) hardValue += 10;
    else hardValue += parseInt(card.rank, 10);
  }
  
  return value <= 21 && value > hardValue;
}

export function isBlackjack(hand: Hand): boolean {
  return hand.cards.length === 2 && handValue(hand) === 21;
}

export function canSplit(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false;
  return hand.cards[0].rank === hand.cards[1].rank;
}

export function canDoubleDown(hand: Hand): boolean {
  return hand.cards.length === 2;
}

export function createGame(bet: number, deckCount: number): BlackjackGame {
  const shoe = createShoe(deckCount);
  const playerHand: Hand = { cards: [drawCard(shoe), drawCard(shoe)] };
  const dealerHand: Hand = { cards: [drawCard(shoe), drawCard(shoe)] };
  
  let status: GameStatus = 'playing';
  
  if (isBlackjack(playerHand)) {
    status = 'blackjack';
  }
  
  return {
    shoe,
    playerHands: [playerHand],
    activeHandIndex: 0,
    dealerHand,
    status,
    bet,
    bets: [bet]
  };
}

export function hit(game: BlackjackGame): BlackjackGame {
  if (game.status !== 'playing') return game;
  
  const hand = game.playerHands[game.activeHandIndex];
  hand.cards.push(drawCard(game.shoe));
  
  if (handValue(hand) > 21 || handValue(hand) === 21) {
    return stand(game);
  }
  
  return game;
}

export function stand(game: BlackjackGame): BlackjackGame {
  if (game.status !== 'playing') return game;
  
  if (game.activeHandIndex < game.playerHands.length - 1) {
    game.activeHandIndex++;
    return game;
  }
  
  game.status = 'dealer_turn';
  return dealerPlay(game);
}

export function doubleDown(game: BlackjackGame): BlackjackGame {
  if (game.status !== 'playing') return game;
  const hand = game.playerHands[game.activeHandIndex];
  if (!canDoubleDown(hand)) return game;
  
  game.bets[game.activeHandIndex] *= 2;
  hand.cards.push(drawCard(game.shoe));
  
  return stand(game);
}

export function split(game: BlackjackGame): BlackjackGame {
  if (game.status !== 'playing') return game;
  const hand = game.playerHands[game.activeHandIndex];
  if (!canSplit(hand)) return game;
  
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];
  
  const hand1: Hand = { cards: [card1, drawCard(game.shoe)] };
  const hand2: Hand = { cards: [card2, drawCard(game.shoe)] };
  
  game.playerHands.splice(game.activeHandIndex, 1, hand1, hand2);
  game.bets.splice(game.activeHandIndex, 1, game.bet, game.bet);
  
  return game;
}

export function dealerPlay(game: BlackjackGame): BlackjackGame {
  if (game.status !== 'dealer_turn') return game;
  
  let val = handValue(game.dealerHand);
  while (val < 17 || (val === 17 && isSoft(game.dealerHand))) {
    game.dealerHand.cards.push(drawCard(game.shoe));
    val = handValue(game.dealerHand);
  }
  
  return game;
}

export function resolveGame(game: BlackjackGame): { status: GameStatus, payout: number } {
  if (game.status === 'blackjack') {
    if (isBlackjack(game.dealerHand)) {
      game.status = 'push';
      return { status: 'push', payout: game.bet };
    }
    return { status: 'blackjack', payout: game.bet * 2.5 };
  }
  
  const dealerVal = handValue(game.dealerHand);
  const dealerBust = dealerVal > 21;
  let totalPayout = 0;
  
  let finalStatus: GameStatus = 'push';
  
  for (let i = 0; i < game.playerHands.length; i++) {
    const hand = game.playerHands[i];
    const bet = game.bets[i];
    const val = handValue(hand);
    
    if (val > 21) {
      finalStatus = 'player_bust';
    } else if (dealerBust) {
      finalStatus = 'dealer_bust';
      totalPayout += bet * 2;
    } else if (val > dealerVal) {
      finalStatus = 'player_win';
      totalPayout += bet * 2;
    } else if (val < dealerVal) {
      finalStatus = 'dealer_win';
    } else {
      finalStatus = 'push';
      totalPayout += bet;
    }
  }
  
  game.status = finalStatus;
  return { status: finalStatus, payout: totalPayout };
}

export function cardToEmoji(card: Card): string {
  const suitEmojis: Record<Suit, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
  };
  return `${card.rank}${suitEmojis[card.suit]}`;
}

export function handToString(hand: Hand, hideSecond = false): string {
  if (hideSecond && hand.cards.length > 1) {
    return `${cardToEmoji(hand.cards[0])} [?]`;
  }
  return hand.cards.map(cardToEmoji).join(' ');
}
