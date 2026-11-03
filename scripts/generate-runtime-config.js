import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import 'dotenv/config';

const required = ['API_BASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing Vercel build environment variables: ${missing.join(', ')}`);
}

const config = {
  apiBaseUrl: process.env.API_BASE_URL.replace(/\/+$/, ''),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
};
for (const key of required) {
  const value = process.env[key];
  if (key === 'API_BASE_URL' && new URL(value).origin !== value.replace(/\/+$/, '')) {
    throw new Error('API_BASE_URL must contain only the Render API origin, without a path.');
  }
}

const publicDirectory = resolve('public');
await copyFile(
  resolve('node_modules/@supabase/supabase-js/dist/umd/supabase.js'),
  resolve(publicDirectory, 'supabase.js')
);
await writeFile(
  resolve(publicDirectory, 'runtime-config.js'),
  `window.SATRIA_CONFIG = Object.freeze(${JSON.stringify(config)});\n`,
  'utf8'
);

for (const entry of await readdir(publicDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = resolve(publicDirectory, entry.name);
  const html = (await readFile(file, 'utf8'))
    .replace(/<script src="(?:https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?:\/dist\/umd\/supabase\.js)?|\/supabase\.js|\/runtime-config\.js|\/api-client\.js)"><\/script>/g, '');
  const scripts = '<script src="/supabase.js"></script><script src="/runtime-config.js"></script><script src="/api-client.js"></script>';
  if (!html.includes('</head>')) throw new Error(`Missing </head> in ${entry.name}`);
  await writeFile(file, html.replace('</head>', `${scripts}</head>`), 'utf8');
}
console.log('Generated public runtime configuration for the SATRIA pages.');
