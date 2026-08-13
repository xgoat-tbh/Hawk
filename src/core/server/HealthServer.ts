import http from 'node:http';
import { consoleLog } from '../logging/ConsoleLogger.js';

let server: http.Server | null = null;

export function startHealthServer(): void {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;

  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Amo Hawk Discord Bot',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  });

  server.listen(port, () => {
    consoleLog('info', 'startup', `HTTP health server listening on port ${port}`);
  });

  server.on('error', (error) => {
    consoleLog('warning', 'startup', `HTTP health server error: ${error.message}`);
  });
}

export function stopHealthServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
