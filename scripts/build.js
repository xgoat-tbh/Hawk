import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const distDir = path.resolve('dist');
const sqlSrc = path.resolve('src/core/database/migrations/sql');
const sqlDest = path.resolve('dist/core/database/migrations/sql');

console.log('[Build] Cleaning dist directory...');
fs.rmSync(distDir, { recursive: true, force: true });

console.log('[Build] Compiling TypeScript...');
try {
  const isWindows = process.platform === 'win32';
  const tscBin = path.resolve('node_modules', '.bin', isWindows ? 'tsc.cmd' : 'tsc');
  if (fs.existsSync(tscBin)) {
    execSync(`"${tscBin}"`, { stdio: 'inherit' });
  } else {
    execSync('npx --no-install tsc', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('[Build] TypeScript compilation failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log('[Build] Copying SQL migration assets...');
if (fs.existsSync(sqlSrc)) {
  fs.mkdirSync(sqlDest, { recursive: true });
  fs.cpSync(sqlSrc, sqlDest, { recursive: true, force: true });
}

console.log('[Build] Build completed successfully!');

