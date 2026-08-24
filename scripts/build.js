import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = path.resolve('dist');
const sqlSrc = path.resolve('src/core/database/migrations/sql');
const sqlDest = path.resolve('dist/core/database/migrations/sql');

console.log('[Build] Cleaning dist directory...');
fs.rmSync(distDir, { recursive: true, force: true });

console.log('[Build] Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

console.log('[Build] Copying SQL migration assets...');
if (fs.existsSync(sqlSrc)) {
  fs.mkdirSync(sqlDest, { recursive: true });
  fs.cpSync(sqlSrc, sqlDest, { recursive: true, force: true });
}

console.log('[Build] Build completed successfully!');
