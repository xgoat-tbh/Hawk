import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/hawk';

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof postgres> | undefined;
};

export const db =
  globalForDb.db ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
