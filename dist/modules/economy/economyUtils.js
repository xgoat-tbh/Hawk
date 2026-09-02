/**
 * Parse an amount string supporting:
 * - Scientific notation: 1e9 (= 1,000,000,000), 2.5e6 (= 2,500,000), 5e4 (= 50,000)
 * - Suffix shortcuts: 1k (1,000), 1m (1,000,000), 1b (1,000,000,000), 1t (1,000,000,000,000)
 * - Commas & decimals: 1,000,000 or 1.5k
 * - Plain numbers: 1000
 */
export function parseAmount(input) {
    if (!input)
        return null;
    const cleaned = input.trim().toLowerCase().replace(/,/g, '');
    if (!cleaned)
        return null;
    // Scientific notation e.g. 1e9, 2.5e6, 5e+6
    const sciMatch = /^(\d+(?:\.\d+)?)[eE]\+?(\d+)$/.exec(cleaned);
    if (sciMatch) {
        const base = parseFloat(sciMatch[1]);
        const exp = parseInt(sciMatch[2], 10);
        if (isNaN(base) || isNaN(exp) || exp > 15)
            return null;
        const val = Math.floor(base * Math.pow(10, exp));
        return isFinite(val) && val > 0 ? val : null;
    }
    // Suffix notation e.g. 1k, 1.5m, 2b, 1t
    const suffixMatch = /^(\d+(?:\.\d+)?)([kmbt])$/.exec(cleaned);
    if (suffixMatch) {
        const num = parseFloat(suffixMatch[1]);
        const suffix = suffixMatch[2];
        if (isNaN(num))
            return null;
        const multipliers = {
            k: 1_000,
            m: 1_000_000,
            b: 1_000_000_000,
            t: 1_000_000_000_000,
        };
        const val = Math.floor(num * multipliers[suffix]);
        return isFinite(val) && val > 0 ? val : null;
    }
    // Plain integers
    if (/^\d+$/.test(cleaned)) {
        const val = parseInt(cleaned, 10);
        return isFinite(val) && val > 0 ? val : null;
    }
    // Decimal numbers
    if (/^\d+\.\d+$/.test(cleaned)) {
        const val = Math.floor(parseFloat(cleaned));
        return isFinite(val) && val > 0 ? val : null;
    }
    return null;
}
//# sourceMappingURL=economyUtils.js.map