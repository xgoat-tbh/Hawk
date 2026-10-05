// Next and secure-cookie settings must agree when using the integrated dev server.
Object.assign(process.env, { NODE_ENV: 'development' });
await import('./index.js');
export {};
