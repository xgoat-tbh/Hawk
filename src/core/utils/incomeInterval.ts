export function incomeIntervalSeconds(value: string | number): number {
  // Older bot commands stored bare seconds; dashboard values use m/h/d.
  const match = String(value).match(/^(\d+)(s|m|h|d)?$/);
  if (!match) return 86400;
  const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2] || 's'] || 1);
  return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : 86400;
}
