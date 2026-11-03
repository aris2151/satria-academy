import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const allowed = new Set(['announcement','hero_eyebrow','hero_title_line1','hero_title_line2','hero_title_line3','hero_description','hero_image_url','contact_whatsapp']);
const limits = { announcement: 160, hero_eyebrow: 100, hero_title_line1: 80, hero_title_line2: 80, hero_title_line3: 80, hero_description: 700, hero_image_url: 500, contact_whatsapp: 24 };
const defaultSettings = {
  announcement: 'SATRIA ACADEMY • DISCIPLINE / READINESS / HONOR',
  hero_eyebrow: 'Military & Police Academy Prep',
  hero_title_line1: 'YOUR FUTURE.',
  hero_title_line2: 'YOUR HONOR.',
  hero_title_line3: 'YOUR MISSION.',
  hero_description: 'Bimbingan persiapan seleksi TNI–Polri melalui pembelajaran akademik, psikotes, pembinaan fisik bertahap, dan evaluasi rutin. Bangun kesiapanmu lewat proses yang disiplin dan terukur.',
  hero_image_url: '',
  contact_whatsapp: '6281225044520'
};

function validate(key, value) {
  if (!allowed.has(key)) return 'Pengaturan tidak dikenal.';
  if (typeof value !== 'string') return 'Nilai harus berupa teks.';
  if (value.length > limits[key]) return 'Teks terlalu panjang.';
  if (key === 'hero_image_url' && value.trim()) {
    try { const u = new URL(value.trim()); if (u.protocol !== 'https:') return 'URL gambar harus menggunakan HTTPS.'; } catch { return 'URL gambar tidak valid.'; }
  }
  if (key === 'contact_whatsapp' && value && !/^[1-9][0-9]{8,14}$/.test(value)) return 'Nomor WhatsApp harus memakai kode negara dan angka saja, misalnya 62812xxxxxxxx.';
  return null;
}

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query('SELECT content_key, content_value, updated_at FROM site_content ORDER BY content_key');
    const stored = new Map((result.rows || []).map(row => [row.content_key, row]));
    const settings = [...allowed].map(content_key => ({
      content_key,
      content_value: stored.get(content_key)?.content_value ?? defaultSettings[content_key],
      updated_at: stored.get(content_key)?.updated_at ?? null
    }));
    return res.json({ settings });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  const value = typeof req.body?.value === 'string' ? req.body.value.trim() : null;
  const error = validate(key, value);
  if (error) return res.status(400).json({ error });
  const result = await db.query(
    'INSERT INTO site_content (content_key, content_value, updated_at) VALUES ($1,$2,now()) ON CONFLICT (content_key) DO UPDATE SET content_value=EXCLUDED.content_value, updated_at=now() RETURNING content_key, content_value, updated_at',
    [key, value]
  );
  return res.json({ ok: true, setting: result.rows[0] });
}