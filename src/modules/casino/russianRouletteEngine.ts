export function createChamber(bulletCount: number, totalChambers: number): boolean[] {
  const chambers = Array(totalChambers).fill(false);
  for (let i = 0; i < bulletCount; i++) {
    chambers[i] = true;
  }
  
  // Shuffle
  for (let i = chambers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chambers[i], chambers[j]] = [chambers[j], chambers[i]];
  }
  
  return chambers;
}

export function pullTrigger(chambers: boolean[], position: number): { fired: boolean, position: number } {
  const fired = chambers[position];
  return { fired, position: (position + 1) % chambers.length };
}

export function calculatePayout(bulletCount: number, totalChambers: number, bet: number): number {
  if (bulletCount >= totalChambers) return 0;
  const multiplier = totalChambers / (totalChambers - bulletCount);
  return Math.floor(bet * multiplier);
}

export function survivalProbability(bulletCount: number, totalChambers: number): number {
  return (totalChambers - bulletCount) / totalChambers;
}
