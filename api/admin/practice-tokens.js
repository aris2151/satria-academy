import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET', 'POST'];

const normalizeToken = value => typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32) : '';
async function hashToken(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function createToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  return 'SAT-' + chars.slice(0,4) + '-' + chars.slice(4,8) + '-' + chars.slice(8,12);
}

export default async function (req, res) {
  if (req.method === 'GET') {
    const quizId = Number(req.query?.quiz_id || 0);
    const params = quizId > 0 ? [quizId] : [];
    const result = await db.query(
      `SELECT t.id, t.quiz_id, q.title AS quiz_title, t.token_hint, t.label, t.created_at, t.expires_at, t.revoked_at,
              (t.revoked_at IS NULL AND t.expires_at >= now()) AS is_active
       FROM practice_quiz_tokens t JOIN practice_quizzes q ON q.id=t.quiz_id
       ${quizId > 0 ? 'WHERE t.quiz_id=$1' : ''}
       ORDER BY t.created_at DESC LIMIT 200`, params
    );
    return res.json({ tokens: result.rows });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung.' });
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  const body = req.body || {};
  if (body.action === 'revoke') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID token tidak valid.' });
    const result = await db.query('UPDATE practice_quiz_tokens SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Token tidak ditemukan atau sudah dicabut.' });
    return res.json({ ok: true, message: 'Token berhasil dicabut.' });
  }
  if (body.action !== 'issue') return res.status(400).json({ error: 'Aksi token tidak dikenal.' });
  const quizId = Number(body.quiz_id);
  if (!Number.isSafeInteger(quizId) || quizId < 1) return res.status(400).json({ error: 'Pilih latihan yang valid.' });
  const quizResult = await db.query('SELECT id, title, week_end FROM practice_quizzes WHERE id=$1 AND is_published=true', [quizId]);
  if (!quizResult.rows.length) return res.status(404).json({ error: 'Terbitkan latihan terlebih dahulu sebelum membuat token.' });
  const quiz = quizResult.rows[0];
  const token = createToken();
  const tokenHash = await hashToken(normalizeToken(token));
  const result = await db.query(
    `INSERT INTO practice_quiz_tokens (quiz_id, token_hash, token_hint, label, expires_at, created_by)
     VALUES ($1,$2,$3,$4,($5::date + interval '1 day'), 'admin')
     RETURNING id, quiz_id, token_hint, label, created_at, expires_at`,
    [quizId, tokenHash, token.slice(-4), String(body.label || 'Token latihan mingguan').trim().slice(0,100), quiz.week_end]
  );
  return res.status(201).json({ ok: true, token, record: result.rows[0], warning: 'Simpan token sekarang. Demi keamanan, token lengkap tidak akan ditampilkan lagi.' });
}