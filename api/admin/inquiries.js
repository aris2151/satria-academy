import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const allowedStatuses = new Set(['Baru','Dihubungi','Konsultasi','Terdaftar','Tidak lanjut']);

export default async function (req, res) {
  if (req.method === 'GET') {
    const status = typeof req.query?.status === 'string' ? req.query.status : '';
    const query = status && allowedStatuses.has(status)
      ? await db.query('SELECT id,full_name,phone,target_path,package_name,city,message,status,created_at,updated_at FROM admissions_inquiries WHERE status=$1 ORDER BY created_at DESC LIMIT 300', [status])
      : await db.query('SELECT id,full_name,phone,target_path,package_name,city,message,status,created_at,updated_at FROM admissions_inquiries ORDER BY created_at DESC LIMIT 300');
    const counts = await db.query("SELECT status,COUNT(*)::int AS count FROM admissions_inquiries GROUP BY status");
    return res.json({ inquiries: query.rows, counts: Object.fromEntries(counts.rows.map(row => [row.status,row.count])) });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });
  const id = Number(req.body?.id);
  const status = typeof req.body?.status === 'string' ? req.body.status : '';
  if (!Number.isSafeInteger(id) || id < 1 || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: 'ID atau status pendaftaran tidak valid.' });
  }
  const result = await db.query('UPDATE admissions_inquiries SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,status,updated_at', [status,id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Pendaftaran tidak ditemukan.' });
  return res.json({ ok: true, inquiry: result.rows[0] });
}