/**
 * Layered name matcher — priority order:
 *  1. Exact case-insensitive
 *  2. Full-name starts-with query
 *  3. All query words each start a word in the target name (word-prefix)
 *  4. All query words appear anywhere in the target name (word-contains)
 *  5. Fuse.js fuzzy (last resort, tight threshold + ambiguity check)
 *
 * When a layer returns multiple candidates, the one with the shortest name
 * wins (most specific match). This correctly handles:
 *  "mod"     → Moderator  (not Trial Moderator or Senior Moderator)
 *  "t mod"   → Trial Moderator
 *  "hangout5" → Hangout 5  (via normalized matching injected before fuzzy)
 */
export interface MatchItem {
    id: string;
    name: string;
}
export type MatchResult<T extends MatchItem> = {
    outcome: 'resolved';
    item: T;
} | {
    outcome: 'not_found';
} | {
    outcome: 'ambiguous';
    candidates: T[];
};
/**
 * Layered name matching with deterministic priority over fuzzy.
 * @param items  Array of named items to search
 * @param query  The user's raw query string
 * @param maxFuzzyResults  Max candidates to show if ambiguous (default 5)
 */
export declare function layeredMatch<T extends MatchItem>(items: T[], query: string, maxFuzzyResults?: number): MatchResult<T>;
//# sourceMappingURL=LayeredMatcher.d.ts.map