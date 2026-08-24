import http from 'node:http';
import { consoleLog } from '../logging/ConsoleLogger.js';
let server = null;
export function startHealthServer() {
    if (server)
        return;
    const rawPort = process.env.PORT || process.env.SERVER_PORT;
    const port = rawPort ? parseInt(rawPort, 10) : 10000;
    const host = '0.0.0.0';
    server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'Discord Bot API Service',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        }));
    });
    server.listen(port, host, () => {
        consoleLog('info', 'startup', `HTTP health server listening on ${host}:${port}`);
    });
    server.on('error', (error) => {
        consoleLog('warning', 'startup', `HTTP health server error: ${error.message}`);
    });
}
export function stopHealthServer() {
    if (server) {
        server.close();
        server = null;
    }
}
//# sourceMappingURL=HealthServer.js.map