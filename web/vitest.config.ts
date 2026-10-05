import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({ plugins: [react()], resolve: { alias: { '@': path.resolve(import.meta.dirname) } }, test: { environment: 'jsdom', include: ['__tests__/**/*.test.tsx'], setupFiles: ['__tests__/setup.ts'] } });
