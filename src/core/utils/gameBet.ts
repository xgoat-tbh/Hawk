export function validGameBet(amount: number, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(amount) && amount >= minimum && amount <= maximum;
}
