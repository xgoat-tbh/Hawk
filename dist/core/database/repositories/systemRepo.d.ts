export interface MaintenanceState {
    enabled: boolean;
    reason: string;
    enabledAt: Date | null;
    enabledBy: string | null;
}
export declare function getMaintenanceState(): Promise<MaintenanceState>;
export declare function setMaintenanceState(enabled: boolean, reason?: string, enabledBy?: string | null): Promise<void>;
export declare function invalidateMaintenanceCache(): void;
//# sourceMappingURL=systemRepo.d.ts.map