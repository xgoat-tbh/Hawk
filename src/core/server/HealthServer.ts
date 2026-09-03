import http from 'node:http';
import { consoleLog } from '../logging/ConsoleLogger.js';

let server: http.Server | null = null;

export function startHealthServer(): void {
  if (server) return;

  // Primary PORT is reserved for the Next.js Web Dashboard.
  const dashboardPort = parseInt(String(process.env.SERVER_PORT || process.env.PORT || process.env.DASHBOARD_PORT || '3000'), 10);
  const healthPortEnv = process.env.HEALTH_PORT;

  // Avoid EADDRINUSE on platforms like Render where PORT is assigned to 10000
  if (!healthPortEnv && dashboardPort === 10000) {
    consoleLog('info', 'startup', 'Web dashboard is configured on port 10000; health checks are served via Next.js /api/health.');
    return;
  }

  const port = healthPortEnv ? parseInt(healthPortEnv, 10) : (dashboardPort === 10000 ? 10001 : 10000);
  const host = '0.0.0.0';

  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Hawk Bot & Dashboard Service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  });

  server.listen(port, host, () => {
    consoleLog('info', 'startup', `HTTP health server listening on ${host}:${port}`);
  });

  server.on('error', (error) => {
    // Port in use or non-critical
    consoleLog('warning', 'startup', `HTTP health server notice: ${error.message}`);
  });
}

export function stopHealthServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
