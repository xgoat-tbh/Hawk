export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

export type BetType = 'straight' | 'red' | 'black' | 'even' | 'odd' | 'dozen' | 'column' | 'half';

export interface RouletteBet {
  type: BetType;
  value?: number; // for straight (0-36), dozen (1-3), column (1-3), half (1-2)
}

export function spin(): number {
  return Math.floor(Math.random() * 37); // 0 to 36
}

export function getColor(num: number): 'red' | 'black' | 'green' {
  if (num === 0) return 'green';
  if (RED_NUMBERS.has(num)) return 'red';
  return 'black';
}

export function parseBet(betStr: string): RouletteBet | null {
  const lower = betStr.toLowerCase().trim();
  
  if (['red', 'r'].includes(lower)) return { type: 'red' };
  if (['black', 'b'].includes(lower)) return { type: 'black' };
  if (['even', 'e'].includes(lower)) return { type: 'even' };
  if (['odd', 'o'].includes(lower)) return { type: 'odd' };
  
  if (['1st12', 'first12', 'dozen1', 'd1'].includes(lower)) return { type: 'dozen', value: 1 };
  if (['2nd12', 'second12', 'dozen2', 'd2'].includes(lower)) return { type: 'dozen', value: 2 };
  if (['3rd12', 'third12', 'dozen3', 'd3'].includes(lower)) return { type: 'dozen', value: 3 };
  
  if (['col1', 'c1', 'column1'].includes(lower)) return { type: 'column', value: 1 };
  if (['col2', 'c2', 'column2'].includes(lower)) return { type: 'column', value: 2 };
  if (['col3', 'c3', 'column3'].includes(lower)) return { type: 'column', value: 3 };
  
  if (['1-18', 'half1', 'h1', 'low'].includes(lower)) return { type: 'half', value: 1 };
  if (['19-36', 'half2', 'h2', 'high'].includes(lower)) return { type: 'half', value: 2 };

  const num = parseInt(lower, 10);
  if (!isNaN(num) && num >= 0 && num <= 36) {
    return { type: 'straight', value: num };
  }
  
  return null;
}

export function evaluateBet(bet: RouletteBet, result: number): { won: boolean, multiplier: number } {
  if (result === 0 && bet.type !== 'straight') {
    return { won: false, multiplier: 0 };
  }

  switch (bet.type) {
    case 'straight':
      return result === bet.value ? { won: true, multiplier: 36 } : { won: false, multiplier: 0 };
    case 'red':
      return RED_NUMBERS.has(result) ? { won: true, multiplier: 2 } : { won: false, multiplier: 0 };
    case 'black':
      return BLACK_NUMBERS.has(result) ? { won: true, multiplier: 2 } : { won: false, multiplier: 0 };
    case 'even':
      return result % 2 === 0 ? { won: true, multiplier: 2 } : { won: false, multiplier: 0 };
    case 'odd':
      return result % 2 !== 0 ? { won: true, multiplier: 2 } : { won: false, multiplier: 0 };
    case 'dozen':
      if (bet.value === 1 && result >= 1 && result <= 12) return { won: true, multiplier: 3 };
      if (bet.value === 2 && result >= 13 && result <= 24) return { won: true, multiplier: 3 };
      if (bet.value === 3 && result >= 25 && result <= 36) return { won: true, multiplier: 3 };
      return { won: false, multiplier: 0 };
    case 'column':
      if (bet.value === 1 && result % 3 === 1) return { won: true, multiplier: 3 };
      if (bet.value === 2 && result % 3 === 2) return { won: true, multiplier: 3 };
      if (bet.value === 3 && result % 3 === 0) return { won: true, multiplier: 3 };
      return { won: false, multiplier: 0 };
    case 'half':
      if (bet.value === 1 && result >= 1 && result <= 18) return { won: true, multiplier: 2 };
      if (bet.value === 2 && result >= 19 && result <= 36) return { won: true, multiplier: 2 };
      return { won: false, multiplier: 0 };
    default:
      return { won: false, multiplier: 0 };
  }
}
