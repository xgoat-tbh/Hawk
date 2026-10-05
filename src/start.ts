import { existsSync } from 'node:fs';

Object.assign(process.env, { NODE_ENV: 'production' });
if (!existsSync('web/.next/BUILD_ID')) {
  throw new Error('Production dashboard build is missing. Run npm run build before npm start.');
}
await import('./index.js');
export {};
