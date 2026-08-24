import type { PermissionContext } from '../../types/permission.js';
import { AuthorityLevel } from '../../types/permission.js';
export interface RestrictionCheckResult {
    allowed: boolean;
    reason: string;
}
export declare function checkRestrictions(ctx: PermissionContext, authority: AuthorityLevel): Promise<RestrictionCheckResult>;
//# sourceMappingURL=RestrictionChecker.d.ts.map