import type { ArgumentToken } from '../../types/command.js';
export interface TokenizeResult {
    args: string[];
    tokens: ArgumentToken[];
}
export declare function tokenize(raw: string): TokenizeResult;
//# sourceMappingURL=ArgumentTokenizer.d.ts.map