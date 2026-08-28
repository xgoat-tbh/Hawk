import * as economyService from '../economy/economyService.js';

export const casinoService = {
  async validateBet(_guildId: string, amount: number): Promise<boolean> {
    if (isNaN(amount) || amount <= 0) return false;
    
    // In a real implementation we would fetch these from config
    const minBet = 10;
    const maxBet = 50000;
    
    if (amount < minBet || amount > maxBet) return false;
    return true;
  },
  
  async placeBet(guildId: string, userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await economyService.getBalance(guildId, userId);
      if (balance.cash < amount) {
        // Option to deduct from bank if we wanted, but placeBet says "deducts cash"
        return false;
      }
      
      await economyService.removeCash(guildId, userId, amount);
      return true;
    } catch (error) {
      console.error('Error placing bet:', error);
      return false;
    }
  },
  
  async awardWinnings(guildId: string, userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    try {
      await economyService.addCash(guildId, userId, amount);
    } catch (error) {
      console.error('Error awarding winnings:', error);
    }
  }
};
