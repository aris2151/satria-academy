import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const clean = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validDate = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; };
function validateQuestions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return 'Isi 1 sampai 50 soal.';
  for (let i = 0; i < value.length; i++) {
    const q = value[i];
    if (!q || typeof q.question !== 'string' || !q.question.trim() || q.question.length > 1200) return `Teks soal nomor ${i + 1} wajib diisi (maksimal 1.200 karakter).`;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 400)) return `Soal nomor ${i + 1} harus memiliki 2–6 pilihan jawaban yang terisi.`;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return `Kunci jawaban soal nomor ${i + 1} tidak valid.`;
    if (typeof (q.explanation || '') !== 'string' || (q.explanation || '').length > 1200) return `Pembahasan soal nomor ${i + 1} terlalu panjang.`;
  }
  return null;
}

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query('SELECT id, slug, title, category, description, week_label, week_start, week_end, duration_minutes, questions, is_published, created_at, updated_at FROM practice_quizzes ORDER BY week_start DESC, id DESC LIMIT 100');
    return res.json({ quizzes: result.rows });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });

  const body = req.body || {};
  const slug = clean(body.slug, 90).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const title = clean(body.title, 180);
  const category = clean(body.category, 80) || 'Akademik';
  const description = clean(body.description, 1200);
  const weekLabel = clean(body.week_label, 120);
  const weekStart = clean(body.week_start, 10);
  const weekEnd = clean(body.week_end, 10);
  const duration = Number(body.duration_minutes || 30);
  const questions = body.questions;
  const isPublished = body.is_published === true || body.is_published === 'true';
  const id = Number(body.id || 0);

  if (!slug || !title) return res.status(400).json({ error: 'Slug dan judul latihan wajib diisi.' });
  if (!validDate(weekStart) || !validDate(weekEnd) || weekEnd < weekStart) return res.status(400).json({ error: 'Tanggal mulai dan selesai harus valid; tanggal selesai tidak boleh sebelum tanggal mulai.' });
  if (!Number.isInteger(duration) || duration < 1 || duration > 240) return res.status(400).json({ error: 'Durasi harus antara 1–240 menit.' });
  const questionError = validateQuestions(questions);
  if (questionError) return res.status(400).json({ error: questionError });

  if (id > 0) {
    const updated = await db.query(
      'UPDATE practice_quizzes SET slug=$1,title=$2,category=$3,description=$4,week_label=$5,week_start=$6::date,week_end=$7::date,duration_minutes=$8,questions=$9::jsonb,is_published=$10,updated_at=now() WHERE id=$11 RETURNING id,slug,title,category,description,week_label,week_start,week_end,duration_minutes,questions,is_published,updated_at',
      [slug,title,category,description,weekLabel,weekStart,weekEnd,duration,JSON.stringify(questions),isPublished,id]
    );
    if (!updated.rows.length) return res.status(404).json({ error: 'Latihan tidak ditemukan.' });
    return res.json({ ok: true, quiz: updated.rows[0] });
  }
  const created = await db.query(
    'INSERT INTO practice_quizzes (slug,title,category,description,week_label,week_start,week_end,duration_minutes,questions,is_published) VALUES ($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9::jsonb,$10) ON CONFLICT (slug) DO NOTHING RETURNING id,slug,title,category,description,week_label,week_start,week_end,duration_minutes,questions,is_published,created_at',
    [slug,title,category,description,weekLabel,weekStart,weekEnd,duration,JSON.stringify(questions),isPublished]
  );
  if (!created.rows.length) return res.status(409).json({ error: 'Slug sudah digunakan. Ubah slug atau edit latihan yang sudah ada.' });
  return res.status(201).json({ ok: true, quiz: created.rows[0] });
}