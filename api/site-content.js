import { db } from '../server/db.js';

export const access = 'public';
export const methods = ['GET'];

const publicKeys = ['announcement','hero_eyebrow','hero_title_line1','hero_title_line2','hero_title_line3','hero_description','hero_image_url','contact_whatsapp'];
const defaultSettings = {
  announcement: 'SATRIA ACADEMY • DISCIPLINE / READINESS / HONOR',
  hero_eyebrow: 'Military & Police Academy Prep',
  hero_title_line1: 'PERSIAPAN',
  hero_title_line2: 'TNI-POLRI',
  hero_title_line3: 'DENGAN DISIPLIN',
  hero_description: 'Bimbingan seleksi TNI–Polri yang terarah: akademik, psikotes, fisik, dan evaluasi rutin untuk membangun kesiapan yang disiplin dan terukur.',
  hero_image_url: '',
  contact_whatsapp: '6281225044520'
};

export default async function (req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak didukung.' });

  const settings = { ...defaultSettings };

  const result = await db.query('SELECT content_key, content_value FROM site_content WHERE content_key = ANY($1::text[])', [publicKeys]);
  for (const row of result.rows || []) {
    settings[row.content_key] = row.content_value;
  }

  return res.json({ settings });
}