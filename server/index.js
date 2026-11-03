import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { requireAdmin, requireUser } from './auth.js';
import { pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const apiDirectory = resolve('api');
const allowedOrigins = new Set((process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean));

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`Origin is not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 600
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/inquiries', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Silakan coba lagi beberapa saat.' }
}));

app.get('/healthz', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

async function findApiFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findApiFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
  return files;
}

for (const file of await findApiFiles(apiDirectory)) {
  const route = `/${relative(apiDirectory, file).split(sep).join('/').replace(/\.js$/, '')}`;
  const module = await import(pathToFileURL(file));
  const handler = module.default;
  if (typeof handler !== 'function' || !Array.isArray(module.methods) ||
      !['public', 'user', 'admin'].includes(module.access)) {
    throw new Error(`Invalid API route module: ${file}`);
  }

  const routeHandlers = [(req, res, next) => {
    if (!module.methods.includes(req.method)) {
      return res.status(405).json({ error: 'Metode tidak didukung.' });
    }
    if (module.access === 'user' || module.access === 'admin') res.set('Cache-Control', 'private, no-store');
    return next();
  }];
  if (module.access === 'user' || module.access === 'admin') routeHandlers.push(requireUser);
  if (module.access === 'admin') routeHandlers.push(requireAdmin);
  routeHandlers.push((req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  });
  app.all(`/api${route}`, ...routeHandlers);
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use((error, _req, res, _next) => {
  console.error('API request failed:', error);
  if (res.headersSent) return;
  if (error.message && error.message.startsWith('Origin is not allowed by CORS:')) {
    return res.status(403).json({ error: 'Origin tidak diizinkan.' });
  }
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Ukuran permintaan terlalu besar.' });
  return res.status(500).json({ error: 'Terjadi kesalahan server. Silakan coba lagi.' });
});

app.listen(port, () => {
  console.log(`SATRIA API listening on port ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await pool.end();
    process.exit(0);
  });
}
