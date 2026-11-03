import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const allowedStatuses = new Set(['Pendaftaran dibuka', 'Menunggu pengumuman', 'Perlu verifikasi', 'Pendaftaran ditutup']);
const clean = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query('SELECT * FROM recruitment_schedule ORDER BY institution ASC, id ASC');
    return res.json({ schedules: result.rows });
  }

  const body = req.body || {};
  const slug = clean(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const institution = clean(body.institution, 80);
  const title = clean(body.title, 160);
  const pathway = clean(body.pathway, 160);
  const cycle = clean(body.cycle, 100);
  const status = clean(body.status, 40);
  const dateLabel = clean(body.date_label, 160);
  const dateDetail = clean(body.date_detail, 500);
  const summary = clean(body.summary, 1200);
  const officialUrl = clean(body.official_url, 500);
  const isVerified = body.is_verified === true || body.is_verified === 'true';
  const isPublished = body.is_published !== false && body.is_published !== 'false';
  const id = Number(body.id || 0);

  if (!slug || !institution || !title || !officialUrl || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: 'Slug, institusi, judul, tautan resmi, dan status yang valid wajib diisi.' });
  }
  let parsedUrl;
  try { parsedUrl = new URL(officialUrl); } catch { return res.status(400).json({ error: 'Tautan resmi tidak valid.' }); }
  const hostname = parsedUrl.hostname.toLowerCase();
  const officialHost = hostname === 'rekrutmen-tni.mil.id' || hostname.endsWith('.rekrutmen-tni.mil.id') || hostname === 'penerimaan.polri.go.id';
  if (parsedUrl.protocol !== 'https:' || !officialHost) {
    return res.status(400).json({ error: 'Gunakan tautan HTTPS dari portal resmi rekrutmen TNI atau penerimaan POLRI.' });
  }
  if (isVerified && status === 'Perlu verifikasi') {
    return res.status(400).json({ error: 'Ubah status dari Perlu verifikasi sebelum menandai informasi sebagai terverifikasi.' });
  }
  if (id > 0) {
    const updated = await db.query(
      'UPDATE recruitment_schedule SET slug=$1,institution=$2,title=$3,pathway=$4,cycle=$5,status=$6,date_label=$7,date_detail=$8,summary=$9,official_url=$10,is_verified=$11,is_published=$12,checked_at=now(),updated_at=now() WHERE id=$13 RETURNING *',
      [slug,institution,title,pathway,cycle,status,dateLabel || 'Belum diumumkan',dateDetail,summary,officialUrl,isVerified,isPublished,id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    return res.json({ ok: true, schedule: updated.rows[0] });
  }
  const created = await db.query(
    'INSERT INTO recruitment_schedule (slug,institution,title,pathway,cycle,status,date_label,date_detail,summary,official_url,is_verified,is_published,checked_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now()) ON CONFLICT (slug) DO NOTHING RETURNING *',
    [slug,institution,title,pathway,cycle,status,dateLabel || 'Belum diumumkan',dateDetail,summary,officialUrl,isVerified,isPublished]
  );
  if (!created.rows.length) return res.status(409).json({ error: 'Slug sudah digunakan. Gunakan slug unik atau edit data yang sudah ada.' });
  return res.status(201).json({ ok: true, schedule: created.rows[0] });
}