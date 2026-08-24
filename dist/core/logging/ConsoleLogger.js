const SEVERITY_COLORS = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    critical: '\x1b[35m',
};
const RESET = '\x1b[0m';
export function consoleLog(severity, category, message, details) {
    const color = SEVERITY_COLORS[severity];
    const time = new Date().toISOString();
    const prefix = `${color}[${severity.toUpperCase()}]${RESET}`;
    const detailStr = details ? ` ${JSON.stringify(details)}` : '';
    const output = severity === 'error' || severity === 'critical' ? process.stderr : process.stdout;
    output.write(`${time} ${prefix} [${category}] ${message}${detailStr}\n`);
}
//# sourceMappingURL=ConsoleLogger.js.map