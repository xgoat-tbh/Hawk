import { Bootstrap } from './core/bootstrap/Bootstrap.js';
Bootstrap.start().catch((error) => {
    console.error('Fatal bootstrap error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map