export const SYMBOLS = [
  { emoji: '[CHERRY]', name: 'cherry', weight: 30, multiplier: 2 },
  { emoji: '[LEMON]', name: 'lemon', weight: 25, multiplier: 3 },
  { emoji: '[ORANGE]', name: 'orange', weight: 20, multiplier: 4 },
  { emoji: '[GRAPE]', name: 'grape', weight: 15, multiplier: 6 },
  { emoji: '[BELL]', name: 'bell', weight: 7, multiplier: 10 },
  { emoji: '[DIAMOND]', name: 'diamond', weight: 2, multiplier: 25 },
  { emoji: '[777]', name: 'seven', weight: 1, multiplier: 50 },
];

export function spinReels(): string[][] {
  const grid: string[][] = [];
  const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);

  const getRandomSymbol = () => {
    let rand = Math.floor(Math.random() * totalWeight);
    for (const symbol of SYMBOLS) {
      if (rand < symbol.weight) return symbol.emoji;
      rand -= symbol.weight;
    }
    return SYMBOLS[0].emoji;
  };

  for (let r = 0; r < 3; r++) {
    const row: string[] = [];
    for (let c = 0; c < 3; c++) {
      row.push(getRandomSymbol());
    }
    grid.push(row);
  }

  return grid;
}

export function evaluatePaylines(grid: string[][]): { won: boolean, multiplier: number, winningLines: number[] } {
  let won = false;
  let totalMultiplier = 0;
  const winningLines: number[] = [];

  const emojiToMultiplier = new Map<string, number>();
  SYMBOLS.forEach(s => emojiToMultiplier.set(s.emoji, s.multiplier));

  for (let r = 0; r < 3; r++) {
    const row = grid[r];
    if (row[0] === row[1] && row[1] === row[2]) {
      won = true;
      totalMultiplier += emojiToMultiplier.get(row[0])! || 0;
      winningLines.push(r);
    } else if (row[0] === row[1] || row[1] === row[2]) {
      // Partial match logic can be tricky, for simplicity standard slots need 3 across or 2 across starting from left.
      // Let's say if 2 match from left, partial multiplier.
      if (row[0] === row[1]) {
        won = true;
        totalMultiplier += (emojiToMultiplier.get(row[0])! || 0) * 0.2; // 20% for 2 match
        winningLines.push(r);
      }
    }
  }

  return { won, multiplier: totalMultiplier, winningLines };
}

export function formatGrid(grid: string[][]): string {
  return grid.map(row => row.join(' | ')).join('\n');
}
