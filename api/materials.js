import { db } from '../server/db.js';

export const access = 'public';
export const methods = ['GET'];

export default async function (req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak didukung.' });
  const result = await db.query(
    'SELECT id,title,category,description,resource_url,resource_type,updated_at FROM learning_materials WHERE is_published=true ORDER BY category ASC,updated_at DESC,id DESC LIMIT 100'
  );
  return res.json({ materials: result.rows });
}