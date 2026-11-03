import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before starting the API.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

export const db = {
  query(text, values) {
    return pool.query(text, values);
  }
};

pool.on('error', error => {
  console.error('Unexpected PostgreSQL pool error:', error);
});
