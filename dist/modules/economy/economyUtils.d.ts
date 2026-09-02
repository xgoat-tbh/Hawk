/**
 * Parse an amount string supporting:
 * - Scientific notation: 1e9 (= 1,000,000,000), 2.5e6 (= 2,500,000), 5e4 (= 50,000)
 * - Suffix shortcuts: 1k (1,000), 1m (1,000,000), 1b (1,000,000,000), 1t (1,000,000,000,000)
 * - Commas & decimals: 1,000,000 or 1.5k
 * - Plain numbers: 1000
 */
export declare function parseAmount(input: string | undefined | null): number | null;
//# sourceMappingURL=economyUtils.d.ts.map