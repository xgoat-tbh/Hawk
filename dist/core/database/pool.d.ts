import postgres from 'postgres';
export declare function getDb(): postgres.Sql;
export declare function validateConnection(): Promise<void>;
export declare function closeDb(): Promise<void>;
//# sourceMappingURL=pool.d.ts.map