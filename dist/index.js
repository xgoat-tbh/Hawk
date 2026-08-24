import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
async function launch() {
    const distBootstrapPath = path.resolve('dist/core/bootstrap/Bootstrap.js');
    // If running via ts-node in a cloud container and dist is missing, build it
    if (!fs.existsSync(distBootstrapPath)) {
        console.log('[HeavenCloud] dist/ not detected. Building project assets...');
        try {
            execSync('npm run build', { stdio: 'inherit' });
        }
        catch (buildErr) {
            console.error('[HeavenCloud] Build failed during startup:', buildErr);
            process.exit(1);
        }
    }
    const { Bootstrap } = await import(pathToFileURL(distBootstrapPath).href);
    await Bootstrap.start();
}
launch().catch((error) => {
    console.error('Fatal bootstrap error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map