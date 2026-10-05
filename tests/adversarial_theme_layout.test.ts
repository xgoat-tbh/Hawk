import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file: string) => readFileSync(new URL('../web/' + file, import.meta.url), 'utf8');
test('theme supports persisted system, dark and light preferences', () => {
 const theme = read('context/ThemeContext.tsx'); assert.match(theme, /'dark' \| 'light' \| 'system'/); assert.match(theme, /hawk_theme/); assert.match(theme, /prefers-color-scheme/); assert.match(read('styles/globals.css'), /\.light\s*\{/); assert.match(read('tailwind.config.mjs'), /darkMode:\s*\["class"\]/);
});
test('navigation uses fixed desktop rails, a mobile overlay and a scroll area', () => {
 const sidebar = read('components/Sidebar.tsx'); assert.match(sidebar, /hidden lg:block/); assert.match(sidebar, /w-\[240px\]/); assert.match(sidebar, /w-\[72px\]/); assert.match(sidebar, /HawkScrollArea/); assert.match(sidebar, /fixed inset-0 z-50 lg:hidden/); assert.match(sidebar, /aria-current/); assert.match(read('components/GuildDashboardShell.tsx'), /Skip to content/);
});
test('normal text tokens meet WCAG AA on every surface in both modes', () => {
 const css = read('styles/globals.css'); const dark = css.match(/:root, \.dark \{([\s\S]*?)\}/)![1]; const light = css.match(/\.light \{([\s\S]*?)\}/)![1];
 const lum = (hex: string) => { const rgb = hex.match(/[a-f0-9]{2}/gi)!.map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]; };
 for (const block of [dark,light]) for (const surface of block.matchAll(/--surface-\d:\s*(#[a-f0-9]{6})/gi)) for (const text of block.matchAll(/--text-(?:primary|secondary|muted):\s*(#[a-f0-9]{6})/gi)) { const a=lum(surface[1]); const b=lum(text[1]); assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${text[0]} on ${surface[0]}`); }
});
