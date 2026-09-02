import Fuse from 'fuse.js';
const WORD_SPLIT_RE = /[\s\-_]+/;
function getName(item) {
    return item.name.toLowerCase();
}
function wordSplit(str) {
    return str.split(WORD_SPLIT_RE).filter(Boolean);
}
/** Strips everything except lowercase alphanumeric. "Hangout 5" → "hangout5" */
function normalizeCompact(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function pickShortest(items) {
    return items.sort((a, b) => a.name.length - b.name.length)[0];
}
/**
 * Layered name matching with deterministic priority over fuzzy.
 * @param items  Array of named items to search
 * @param query  The user's raw query string
 * @param maxFuzzyResults  Max candidates to show if ambiguous (default 5)
 */
export function layeredMatch(items, query, maxFuzzyResults = 5) {
    if (!query || items.length === 0)
        return { outcome: 'not_found' };
    const q = query.toLowerCase().trim();
    if (!q)
        return { outcome: 'not_found' };
    const qWords = q.split(/\s+/).filter(Boolean);
    // 1. Exact case-insensitive name
    const exact = items.filter(i => getName(i) === q);
    if (exact.length === 1)
        return { outcome: 'resolved', item: exact[0] };
    if (exact.length > 1)
        return { outcome: 'resolved', item: pickShortest(exact) };
    // 2. Full starts-with
    const sw = items.filter(i => getName(i).startsWith(q));
    if (sw.length === 1)
        return { outcome: 'resolved', item: sw[0] };
    if (sw.length > 1)
        return { outcome: 'resolved', item: pickShortest(sw) };
    // 3. Word-prefix: every query word starts at least one word in the target name
    const wp = items.filter(i => {
        const nWords = wordSplit(getName(i));
        return qWords.every(qw => nWords.some(nw => nw.startsWith(qw)));
    });
    if (wp.length === 1)
        return { outcome: 'resolved', item: wp[0] };
    if (wp.length > 1)
        return { outcome: 'resolved', item: pickShortest(wp) };
    // 4. Word-contains: every query word is a substring of the full target name
    const wc = items.filter(i => qWords.every(qw => getName(i).includes(qw)));
    if (wc.length === 1)
        return { outcome: 'resolved', item: wc[0] };
    if (wc.length > 1)
        return { outcome: 'resolved', item: pickShortest(wc) };
    // 5. Normalized compact match: "hangout5" matches "Hangout 5"
    const qNorm = normalizeCompact(query);
    if (qNorm) {
        const normMatches = items.filter(i => normalizeCompact(i.name) === qNorm);
        if (normMatches.length === 1)
            return { outcome: 'resolved', item: normMatches[0] };
        if (normMatches.length > 1)
            return { outcome: 'resolved', item: pickShortest(normMatches) };
    }
    // 6. Fuse.js fuzzy fallback with tight threshold + ambiguity detection
    const fuse = new Fuse(items, {
        keys: ['name'],
        threshold: 0.3,
        distance: 80,
        ignoreLocation: true,
        isCaseSensitive: false,
        includeScore: true,
    });
    const results = fuse.search(query, { limit: maxFuzzyResults });
    if (results.length === 0)
        return { outcome: 'not_found' };
    const best = results[0];
    const bestScore = best.score ?? 1;
    // Reject weak matches
    if (bestScore > 0.35)
        return { outcome: 'not_found' };
    // Check for ambiguity: if second-best is too close to best
    if (results.length >= 2) {
        const secondScore = results[1].score ?? 1;
        const gap = secondScore - bestScore;
        if (gap < 0.15) {
            // Multiple results with similar scores — ambiguous
            const ambiguousCandidates = results
                .filter(r => (r.score ?? 1) <= bestScore + 0.15)
                .map(r => r.item);
            return { outcome: 'ambiguous', candidates: ambiguousCandidates };
        }
    }
    return { outcome: 'resolved', item: best.item };
}
//# sourceMappingURL=LayeredMatcher.js.map