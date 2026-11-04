import { cp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import 'dotenv/config';

const required = ['API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing frontend build environment variables: ${missing.join(', ')}`);
}

const config = {
  apiBaseUrl: process.env.API_BASE_URL.replace(/\/+$/, ''),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
};
const apiUrl = new URL(config.apiBaseUrl);
const supabaseUrl = new URL(config.supabaseUrl);
if (apiUrl.search || apiUrl.hash) {
  throw new Error('API_BASE_URL must not contain a query string or fragment.');
}
if (apiUrl.pathname === '/') {
  const isLocalApi = ['localhost', '127.0.0.1'].includes(apiUrl.hostname) && apiUrl.protocol === 'http:';
  if (apiUrl.protocol !== 'https:' && !isLocalApi) {
    throw new Error('API_BASE_URL must use HTTPS except for a local development API.');
  }
} else if (apiUrl.pathname !== '/functions/v1/satria-api' ||
    apiUrl.origin !== supabaseUrl.origin || apiUrl.protocol !== 'https:') {
  throw new Error('API_BASE_URL must be the Supabase satria-api function URL or a local API origin.');
}

const publicDirectory = resolve('public');
const outputDirectory = resolve('dist');
await cp(publicDirectory, outputDirectory, { recursive: true, force: true });
await cp(
  resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),
  resolve(outputDirectory, 'supabase.js')
);
await writeFile(
  resolve(outputDirectory, 'runtime-config.js'),
  `window.SATRIA_CONFIG = Object.freeze(${JSON.stringify(config)});\n`,
  'utf8'
);

for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = resolve(outputDirectory, entry.name);
  const html = (await readFile(file, 'utf8'))
    .replace(/<script src="(?:https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?:\/dist\/umd\/supabase\.js)?|\/supabase\.js|\/runtime-config\.js|\/api-client\.js)"><\/script>/g, '');
  const scripts = '<script src="/supabase.js"></script><script src="/runtime-config.js"></script><script src="/api-client.js"></script>';
  if (!html.includes('</head>')) throw new Error(`Missing </head> in ${entry.name}`);
  await writeFile(file, html.replace('</head>', `${scripts}</head>`), 'utf8');
}
console.log('Built static frontend in dist/ and generated its public runtime configuration.');
