import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);

export function loadModule(file: string, dependencies: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const source = readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, process: { env: {} }, console, Buffer, Headers, Request, Response, URL, Date, setTimeout, clearTimeout, setInterval, clearInterval, require: (name: string) => name in dependencies ? dependencies[name] : require(name), ...extra });
  return exports;
}
