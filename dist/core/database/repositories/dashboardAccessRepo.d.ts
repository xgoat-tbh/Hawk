export interface DashboardAccessEntry {
    userId: string;
    grantedBy: string;
    grantedAt: Date;
    notes?: string | null;
}
export declare function hasDashboardAccess(userId: string): Promise<boolean>;
export declare function grantDashboardAccess(userId: string, grantedBy: string, notes?: string): Promise<void>;
export declare function revokeDashboardAccess(userId: string): Promise<boolean>;
export declare function listDashboardAccess(): Promise<DashboardAccessEntry[]>;
//# sourceMappingURL=dashboardAccessRepo.d.ts.map