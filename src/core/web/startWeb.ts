import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { consoleLog } from '../logging/ConsoleLogger.js';

let webProcess: ChildProcess | null = null;

export function startWebDashboard(): void {
  if (webProcess) return;

  const port = process.env.PORT || process.env.SERVER_PORT || process.env.DASHBOARD_PORT || '3000';
  const webDir = path.join(process.cwd(), 'web');

  if (!fs.existsSync(webDir)) {
    consoleLog('warning', 'dashboard', `Web directory not found at ${webDir}, skipping dashboard.`);
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const nextBinLocal = path.join(webDir, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
  const rootNextBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');

  let command = 'npx';
  let args = ['next', isProd ? 'start' : 'dev', '-p', String(port)];

  if (fs.existsSync(nextBinLocal)) {
    command = nextBinLocal;
    args = [isProd ? 'start' : 'dev', '-p', String(port)];
  } else if (fs.existsSync(rootNextBin)) {
    command = rootNextBin;
    args = [isProd ? 'start' : 'dev', '-p', String(port)];
  }

  consoleLog('info', 'dashboard', `Launching Next.js Dashboard on port ${port} (mode: ${isProd ? 'production' : 'development'})...`);

  try {
    webProcess = spawn(command, args, {
      cwd: webDir,
      env: {
        ...process.env,
        PORT: String(port),
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    webProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const raw of lines) {
        const line = raw.trim();
        if (line && !line.includes('ready in') && !line.includes('compiled in')) {
          consoleLog('info', 'dashboard', line);
        } else if (line) {
          consoleLog('info', 'dashboard', `Dashboard Ready: ${line}`);
        }
      }
    });

    webProcess.stderr?.on('data', (data) => {
      const line = data.toString().trim();
      if (line && !line.includes('ExperimentalWarning') && !line.includes('Warning: Next.js inferred')) {
        consoleLog('warning', 'dashboard', line);
      }
    });

    webProcess.on('exit', (code, signal) => {
      consoleLog('warning', 'dashboard', `Dashboard process exited with code ${code} (${signal || 'none'})`);
      webProcess = null;
    });
  } catch (error) {
    consoleLog('error', 'dashboard', `Failed to start web dashboard process: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function stopWebDashboard(): void {
  if (webProcess) {
    try {
      webProcess.kill('SIGTERM');
    } catch {}
    webProcess = null;
  }
}
