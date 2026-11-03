import { db } from '../server/db.js';

export const access = 'public';
export const methods = ['POST'];

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });
  const body = req.body || {};

  // Honeypot: silently accept bots without creating a record.
  if (clean(body.website, 200)) return res.status(202).json({ ok: true });

  const fullName = clean(body.full_name, 100);
  const phoneRaw = clean(body.phone, 24);
  const phone = phoneRaw.replace(/[\s().-]/g, '');
  const targetPath = clean(body.target_path, 80);
  const packageName = clean(body.package_name, 80);
  const city = clean(body.city, 100);
  const message = clean(body.message, 500);
  const consent = body.consent === true;

  if (!fullName || fullName.length < 2) return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
  if (!/^\+?[0-9]{9,16}$/.test(phone)) return res.status(400).json({ error: 'Nomor HP tidak valid. Periksa kembali nomor yang dimasukkan.' });
  if (!targetPath || !packageName) return res.status(400).json({ error: 'Target seleksi dan paket pilihan wajib diisi.' });
  if (!consent) return res.status(400).json({ error: 'Persetujuan penyimpanan data wajib diberikan.' });

  const result = await db.query(
    'INSERT INTO admissions_inquiries (full_name,phone,target_path,package_name,city,message,consent_at) VALUES ($1,$2,$3,$4,$5,$6,now()) RETURNING id,created_at',
    [fullName, phone, targetPath, packageName, city, message]
  );
  return res.status(201).json({ ok: true, inquiry: { id: result.rows[0].id, created_at: result.rows[0].created_at } });
}