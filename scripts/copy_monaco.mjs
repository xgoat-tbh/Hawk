import { cp, mkdir, readdir, access, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve('monaco-editor'));
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/public/monaco/vs');
await mkdir(path.dirname(target), { recursive: true });
// Remove obsolete versioned assets individually, confined to this asset folder.
async function prune(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  for (const entry of entries) {
    const file = path.resolve(directory, entry.name); const relative = path.relative(target, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || entry.isSymbolicLink()) throw new Error('Unsafe Monaco asset path');
    if (entry.isDirectory()) await prune(file);
    else {
      try { await access(path.join(source, relative)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await unlink(file); }
    }
  }
}
await prune(target);
await cp(source, target, { recursive: true });
