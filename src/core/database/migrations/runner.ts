import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = join(__dirname, 'sql');

export async function runMigrations(): Promise<number> {
  const db = getDb();

  await db`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const applied = await db`SELECT filename FROM _migrations ORDER BY filename`;
  const appliedSet = new Set(applied.map(r => r.filename));

  let files: string[];
  try {
    files = (await readdir(SQL_DIR)).filter(f => f.endsWith('.sql')).sort();
  } catch {
    return 0;
  }

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sqlContent = await readFile(join(SQL_DIR, file), 'utf-8');

    await db.begin(async (tx) => {
      await tx.unsafe(sqlContent);
      await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
    });

    count++;
  }

  return count;
}
