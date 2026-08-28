export interface Rooster {
  name: string;
  attack: number;
  defense: number;
  stamina: number;
  hp: number;
}

export function generateRooster(name: string): Rooster {
  const attack = Math.floor(Math.random() * 10) + 1;
  const defense = Math.floor(Math.random() * 10) + 1;
  const stamina = Math.floor(Math.random() * 10) + 1;
  
  return {
    name,
    attack,
    defense,
    stamina,
    hp: stamina * 10
  };
}

export function calculateWinProbability(r1: Rooster, r2: Rooster): number {
  const r1Score = r1.attack * 1.5 + r1.defense + r1.stamina * 1.2;
  const r2Score = r2.attack * 1.5 + r2.defense + r2.stamina * 1.2;
  const diff = r1Score - r2Score;
  
  // Logistic curve
  return 1 / (1 + Math.exp(-diff / 10));
}

export function simulateFight(r1: Rooster, r2: Rooster): { winner: 1 | 2, rounds: Array<{ attacker: string, damage: number, narrative: string }>, summary: string } {
  const rounds = [];
  const c1 = { ...r1 };
  const c2 = { ...r2 };
  
  let turn = 1;
  while (c1.hp > 0 && c2.hp > 0) {
    if (turn === 1) {
      // c1 attacks c2
      const damage = Math.max(1, Math.floor((c1.attack * (Math.random() + 0.5)) - (c2.defense * Math.random())));
      c2.hp -= damage;
      rounds.push({
        attacker: c1.name,
        damage,
        narrative: `${c1.name} strikes fiercely for ${damage} damage!`
      });
      turn = 2;
    } else {
      // c2 attacks c1
      const damage = Math.max(1, Math.floor((c2.attack * (Math.random() + 0.5)) - (c1.defense * Math.random())));
      c1.hp -= damage;
      rounds.push({
        attacker: c2.name,
        damage,
        narrative: `${c2.name} counters with a vicious peck for ${damage} damage!`
      });
      turn = 1;
    }
  }
  
  const winner = c1.hp > 0 ? 1 : 2;
  const summary = winner === 1 ? `${c1.name} emerges victorious with ${c1.hp} HP remaining!` : `${c2.name} dominates with ${c2.hp} HP remaining!`;
  
  return { winner, rounds, summary };
}
