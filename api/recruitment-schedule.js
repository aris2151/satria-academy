import { db } from '../server/db.js';

export const access = 'public';
export const methods = ['GET'];

export default async function (req, res) {
  const result = await db.query(
    "SELECT id, slug, institution, title, pathway, cycle, status, date_label, date_detail, summary, official_url, is_verified, checked_at, updated_at FROM recruitment_schedule WHERE is_published = true ORDER BY CASE WHEN status = 'Pendaftaran dibuka' THEN 0 WHEN status = 'Menunggu pengumuman' THEN 1 WHEN status = 'Perlu verifikasi' THEN 2 ELSE 3 END, institution ASC"
  );
  return res.json({ schedules: result.rows });
}