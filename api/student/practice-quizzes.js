import { db } from '../../server/db.js';

export const access = 'user';
export const methods = ['POST'];

const normalizeToken = value => typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32) : '';
async function hashToken(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  const body = req.body || {};
  const quizId = Number(body.quiz_id);
  const token = normalizeToken(body.token);
  const answers = body.answers;
  if (!Number.isSafeInteger(quizId) || quizId < 1 || token.length < 12 || token.length > 24 ||
      !Array.isArray(answers) || answers.length > 50 || answers.some(a => !Number.isInteger(a) || a < 0 || a > 5)) {
    return res.status(400).json({ error: 'Data jawaban atau token tidak valid.' });
  }
  const tokenHash = await hashToken(token);
  const found = await db.query(
    `SELECT q.id, q.slug, q.title, q.questions FROM practice_quizzes q
     JOIN practice_quiz_tokens t ON t.quiz_id=q.id
     WHERE q.id=$1 AND q.is_published=true AND CURRENT_DATE BETWEEN q.week_start AND q.week_end
       AND t.token_hash=$2 AND t.revoked_at IS NULL AND t.expires_at >= now()
     LIMIT 1`,
    [quizId, tokenHash]
  );
  if (!found.rows.length) return res.status(403).json({ error: 'Token tidak valid atau akses latihan sudah berakhir.' });
  const quiz = found.rows[0];
  const questions = quiz.questions;
  if (answers.length !== questions.length) return res.status(400).json({ error: 'Jumlah jawaban tidak sesuai dengan jumlah soal.' });
  const review = questions.map((q, index) => ({
    question: index + 1,
    selected: answers[index],
    correctIndex: q.answer,
    isCorrect: answers[index] === q.answer,
    explanation: q.explanation || ''
  }));
  const score = review.reduce((sum, item) => sum + (item.isCorrect ? 1 : 0), 0);
  const saved = await db.query(
    'INSERT INTO quiz_attempts (user_id, quiz_code, quiz_title, score, total, answers) VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id,score,total,created_at',
    [String(req.user.id), quiz.slug, quiz.title, score, questions.length, JSON.stringify(review.map(({ question, selected, isCorrect }) => ({ question, answer: selected, correct: isCorrect })))]
  );
  return res.status(201).json({ ok: true, attempt: saved.rows[0], score, total: questions.length, review });
}