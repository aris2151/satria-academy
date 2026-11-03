import { db } from '../server/db.js';

export const access = 'public';
export const methods = ['GET', 'POST'];

const normalizeToken = value => typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32) : '';
async function hashToken(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req, res) {
  if (req.method === 'GET') {
    const result = await db.query(
      `SELECT id, slug, title, category, description, week_label, week_start, week_end, duration_minutes,
              jsonb_array_length(questions) AS question_count,
              (CURRENT_DATE < week_start) AS upcoming, (CURRENT_DATE BETWEEN week_start AND week_end) AS is_open
       FROM practice_quizzes WHERE is_published = true AND week_end >= CURRENT_DATE
       ORDER BY week_start ASC, id DESC LIMIT 50`
    );
    return res.json({ quizzes: result.rows });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');

  const quizId = Number(req.body?.quiz_id);
  const token = normalizeToken(req.body?.token);
  if (!Number.isSafeInteger(quizId) || quizId < 1 || token.length < 12 || token.length > 24) {
    return res.status(400).json({ error: 'Masukkan token akses latihan mingguan yang valid.' });
  }
  const tokenHash = await hashToken(token);
  const result = await db.query(
    `SELECT q.id, q.slug, q.title, q.category, q.description, q.week_label, q.week_start, q.week_end, q.duration_minutes,
            jsonb_agg(jsonb_build_object('question', item->>'question', 'options', item->'options') ORDER BY ord) AS questions
     FROM practice_quizzes q
     JOIN practice_quiz_tokens t ON t.quiz_id=q.id
     CROSS JOIN LATERAL jsonb_array_elements(q.questions) WITH ORDINALITY AS x(item, ord)
     WHERE q.id=$1 AND q.is_published=true AND CURRENT_DATE BETWEEN q.week_start AND q.week_end
       AND t.token_hash=$2 AND t.revoked_at IS NULL AND t.expires_at >= now()
     GROUP BY q.id LIMIT 1`,
    [quizId, tokenHash]
  );
  if (!result.rows.length) return res.status(403).json({ error: 'Token salah, sudah dicabut/kedaluwarsa, atau latihan tidak sedang aktif.' });
  return res.json({ ok: true, quiz: result.rows[0] });
}