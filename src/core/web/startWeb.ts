import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { consoleLog } from '../logging/ConsoleLogger.js';
import { attachDashboardSocket, closeDashboardSocket } from './socketHandler.js';

let webServer: http.Server | null = null;

export async function startWebDashboard(): Promise<void> {
  if (webServer) return;

  const rawPort = process.env.SERVER_PORT || process.env.PORT || process.env.DASHBOARD_PORT || '3000';
  const port = parseInt(String(rawPort), 10) || 3000;
  const webDir = path.join(process.cwd(), 'web');

  if (!fs.existsSync(webDir)) {
    consoleLog('warning', 'dashboard', `Web directory not found at ${webDir}, skipping dashboard.`);
    return;
  }

  const hasProductionBuild = fs.existsSync(path.join(webDir, '.next', 'BUILD_ID')) || fs.existsSync(path.join(webDir, '.next', 'server'));
  const isDev = process.env.NODE_ENV !== 'production' || !hasNextProductionBuild(webDir);

  try {
    const modeLabel = hasProductionBuild ? (process.env.NODE_ENV === 'production' ? 'production' : 'development') : 'on-the-fly';
    consoleLog('info', 'dashboard', `Initializing Next.js Dashboard on port ${port} (mode: ${modeLabel})...`);
    
    // Dynamically import next to support ESM & CJS runtimes seamlessly
    const nextModule = await import('next');
    // This secret exists only in the server process, never in client bundles.
    process.env.HAWK_INTERNAL_IP_SECRET ||= crypto.randomBytes(32).toString('hex');
    const nextFn = (nextModule.default || nextModule) as any;
    const app = nextFn({ dev: isDev, dir: webDir, hostname: '0.0.0.0', port });
    const handle = app.getRequestHandler();

    await app.prepare();

    webServer = http.createServer((req, res) => {
      const ip = (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
      const stamp = String(Date.now());
      req.headers['x-hawk-client-ip'] = ip;
      req.headers['x-hawk-ip-time'] = stamp;
      req.headers['x-hawk-ip-signature'] = crypto.createHmac('sha256', process.env.HAWK_INTERNAL_IP_SECRET!).update(`${ip}:${stamp}`).digest('hex');
      handle(req, res);
    });

    await attachDashboardSocket(webServer);

    webServer.listen(port, '0.0.0.0', () => {
      consoleLog('info', 'dashboard', `Web Dashboard is online and listening on http://0.0.0.0:${port}`);
    });

    webServer.on('error', (err: any) => {
      consoleLog('warning', 'dashboard', `Dashboard server error: ${err.message}`);
    });
  } catch (error) {
    consoleLog('warning', 'dashboard', `Failed to initialize dashboard server: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hasNextProductionBuild(webDir: string): boolean {
  try {
    return fs.existsSync(path.join(webDir, '.next', 'BUILD_ID')) || fs.existsSync(path.join(webDir, '.next', 'server'));
  } catch {
    return false;
  }
}


export function stopWebDashboard(): void {
  void closeDashboardSocket();
  if (webServer) {
    try {
      webServer.close();
    } catch { /* Server may already be closed during shutdown. */ }
    webServer = null;
  }
}
