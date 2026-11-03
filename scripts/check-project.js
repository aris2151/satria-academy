import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

async function findJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findJavaScript(path));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

const sourceFiles = [
  ...await findJavaScript(resolve('server')),
  ...await findJavaScript(resolve('api')),
  ...await findJavaScript(resolve('scripts')),
  ...await findJavaScript(resolve('public'))
];

for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const routeFiles = await findJavaScript(resolve('api'));
for (const file of routeFiles) {
  const source = await readFile(file, 'utf8');
  if (source.includes("from 'hatchable'") || source.includes('from "hatchable"')) {
    throw new Error(`Hatchable dependency remains in ${file}`);
  }
}

const htmlFiles = (await readdir(resolve('public'), { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.html'));
for (const entry of htmlFiles) {
  const html = await readFile(resolve('public', entry.name), 'utf8');
  const scripts = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scripts)) {
    if (/\bsrc\s*=/i.test(match[0].slice(0, match[0].indexOf('>')))) continue;
    try {
      new Function(match[1]);
    } catch (error) {
      throw new Error(`Invalid inline script in ${entry.name}: ${error.message}`);
    }
  }
}

console.log(`Checked ${sourceFiles.length} JavaScript source files, ${routeFiles.length} API routes, and ${htmlFiles.length} HTML pages.`);
