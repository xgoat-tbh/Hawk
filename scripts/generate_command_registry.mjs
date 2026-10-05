import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commands = [];
async function scan(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!entry.name.endsWith('.ts') || entry.name.startsWith('_')) continue;
    const source = ts.createSourceFile(file, await fs.readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const declaration = source.statements.find(statement => ts.isExportAssignment(statement));
    const expression = declaration?.expression;
    if (!expression || !ts.isCallExpression(expression) || expression.expression.getText(source) !== 'defineCommand' || !ts.isObjectLiteralExpression(expression.arguments[0])) continue;
    const fields = Object.fromEntries(expression.arguments[0].properties.filter(ts.isPropertyAssignment).map(property => [property.name.getText(source).replace(/['"]/g, ''), property.initializer]));
    const string = name => fields[name] && ts.isStringLiteral(fields[name]) ? fields[name].text : '';
    const aliases = fields.aliases && ts.isArrayLiteralExpression(fields.aliases) ? fields.aliases.elements.filter(ts.isStringLiteral).map(value => value.text) : [];
    if (!string('name') || !string('module')) throw new Error(`Nonliteral command identity: ${file}`);
    commands.push({ name: string('name'), aliases, module: string('module'), description: string('description'), usage: string('usage'), ownerOnly: fields.ownerOnly?.kind === ts.SyntaxKind.TrueKeyword, hidden: fields.hidden?.kind === ts.SyntaxKind.TrueKeyword });
  }
}
await scan(path.join(root, 'src/modules')); commands.sort((a, b) => a.name.localeCompare(b.name));
if (!commands.length || new Set(commands.map(command => command.name)).size !== commands.length) throw new Error('Invalid generated command registry');
const target = path.join(root, 'web/lib/commandRegistry.json'); const content = JSON.stringify(commands, null, 2) + '\n';
if (process.argv.includes('--check')) { if (await fs.readFile(target, 'utf8') !== content) throw new Error('Regenerate command metadata before building'); }
else await fs.writeFile(target, content);
console.log(`Verified ${commands.length} canonical bot command definitions`);
