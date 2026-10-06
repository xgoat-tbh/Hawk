import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

test('canvas panel utilities generate theme-aware CSS in the actual Tailwind configuration', async () => {
 const require = createRequire(new URL('../web/package.json', import.meta.url));
 const postcss = require('postcss'); const tailwind = require('tailwindcss');
 const config = (await import('../web/tailwind.config.mjs')).default;
 const source = readFileSync(new URL('../web/components/Commands/FlowCanvas.tsx', import.meta.url), 'utf8');
 const output = await postcss([tailwind({ ...config, content: [{ raw: source, extension: 'tsx' }] })]).process('@tailwind utilities;', { from: undefined });
 assert.match(output.css, /\.bg-panel\s*\{[^}]*--surface-panel-rgb/s);
 assert.match(output.css, /border-panel\s*\{[^}]*--surface-panel-rgb/s);
});
