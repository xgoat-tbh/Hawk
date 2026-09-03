import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import nextEnv from '@next/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load monorepo global environment variables from root .env
const { loadEnvConfig } = nextEnv;
if (typeof loadEnvConfig === 'function') {
  loadEnvConfig(rootDir);
}
dotenv.config({ path: path.resolve(rootDir, '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: rootDir,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
