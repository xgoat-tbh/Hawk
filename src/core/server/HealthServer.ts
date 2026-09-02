import http from 'node:http';
import { consoleLog } from '../logging/ConsoleLogger.js';

let server: http.Server | null = null;

export function startHealthServer(): void {
  if (server) return;

  // Use HEALTH_PORT if explicitly set; otherwise default to 10000
  // Note: Primary PORT is reserved for the Next.js Web Dashboard.
  const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 10000;
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
