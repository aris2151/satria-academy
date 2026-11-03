import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const types = new Set(['pdf','image','video','link']);

function validateUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? null : 'Tautan materi harus menggunakan HTTPS.';
  } catch {
    return 'Tautan materi wajib berupa URL HTTPS yang valid.';
  }
}

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query('SELECT id,title,category,description,resource_url,resource_type,is_published,created_at,updated_at FROM learning_materials ORDER BY updated_at DESC,id DESC LIMIT 200');
    return res.json({ materials: result.rows });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });
  const body = req.body || {};
  if (body.action === 'delete') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID materi tidak valid.' });
    const deleted = await db.query('DELETE FROM learning_materials WHERE id=$1 RETURNING id', [id]);
    if (!deleted.rows.length) return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    return res.json({ ok: true, deleted_id: deleted.rows[0].id });
  }
  const id = Number(body.id || 0);
  const title = clean(body.title, 180);
  const category = clean(body.category, 80) || 'Umum';
  const description = clean(body.description, 1200);
  const resourceUrl = clean(body.resource_url, 1000);
  const resourceType = clean(body.resource_type, 20);
  const isPublished = body.is_published === true || body.is_published === 'true';
  if (!title || !resourceUrl || !types.has(resourceType)) return res.status(400).json({ error: 'Judul, tautan, dan jenis materi wajib diisi.' });
  const urlError = validateUrl(resourceUrl);
  if (urlError) return res.status(400).json({ error: urlError });
  if (id > 0) {
    const updated = await db.query(
      'UPDATE learning_materials SET title=$1,category=$2,description=$3,resource_url=$4,resource_type=$5,is_published=$6,updated_at=now() WHERE id=$7 RETURNING id,title,category,description,resource_url,resource_type,is_published,updated_at',
      [title,category,description,resourceUrl,resourceType,isPublished,id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    return res.json({ ok: true, material: updated.rows[0] });
  }
  const created = await db.query(
    'INSERT INTO learning_materials (title,category,description,resource_url,resource_type,is_published) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,title,category,description,resource_url,resource_type,is_published,created_at,updated_at',
    [title,category,description,resourceUrl,resourceType,isPublished]
  );
  return res.status(201).json({ ok: true, material: created.rows[0] });
}