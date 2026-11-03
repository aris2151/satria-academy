import { db } from '../../server/db.js';

export const access = 'user';
export const methods = ['GET', 'POST'];

const starterTasks = [
  ['Latihan numerik 20 menit', 'Akademik', 1],
  ['Latihan lari ringan dan pemanasan', 'Fisik', 2],
  ['Kerjakan 10 soal wawasan kebangsaan', 'Wawasan', 3]
];

export default async function (req, res) {
  const userId = String(req.user.id);
  if (req.method === 'GET') {
    await db.query(
      "INSERT INTO student_profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
      [userId, req.user.name || '']
    );
    const profile = await db.query(
      'SELECT full_name, target_path, phone, city, created_at, updated_at FROM student_profiles WHERE user_id = $1',
      [userId]
    );
    const attempts = await db.query(
      'SELECT id, quiz_code, quiz_title, score, total, created_at FROM quiz_attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    const tasks = await db.query(
      'SELECT id, title, category, due_date, completed, created_at FROM student_tasks WHERE user_id = $1 ORDER BY completed ASC, due_date ASC NULLS LAST, id DESC LIMIT 50',
      [userId]
    );
    if (tasks.rows.length === 0) {
      for (const [title, category, day] of starterTasks) {
        await db.query(
          "INSERT INTO student_tasks (user_id, title, category, due_date) SELECT $1, $2, $3, CURRENT_DATE + $4::integer WHERE NOT EXISTS (SELECT 1 FROM student_tasks WHERE user_id = $1 AND title = $2)",
          [userId, title, category, day]
        );
      }
    }
    const finalTasks = tasks.rows.length ? tasks : await db.query(
      'SELECT id, title, category, due_date, completed, created_at FROM student_tasks WHERE user_id = $1 ORDER BY completed ASC, due_date ASC NULLS LAST, id DESC LIMIT 50',
      [userId]
    );
    return res.json({ user: { id: userId, email: req.user.email, name: req.user.name || '' }, profile: profile.rows[0], attempts: attempts.rows, tasks: finalTasks.rows });
  }

  const body = req.body || {};
  const action = String(body.action || '');
  if (action === 'save_profile') {
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim().slice(0, 100) : '';
    const target = typeof body.target_path === 'string' ? body.target_path.trim().slice(0, 80) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 24) : '';
    const city = typeof body.city === 'string' ? body.city.trim().slice(0, 100) : '';
    if (!fullName) return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
    const result = await db.query(
      'INSERT INTO student_profiles (user_id, full_name, target_path, phone, city) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, target_path = EXCLUDED.target_path, phone = EXCLUDED.phone, city = EXCLUDED.city, updated_at = now() RETURNING full_name, target_path, phone, city, updated_at',
      [userId, fullName, target, phone, city]
    );
    return res.json({ ok: true, profile: result.rows[0] });
  }
  if (action === 'save_attempt') {
    // Scores must only be created by the server-side weekly-practice grader.
    // Never accept a client-supplied score, total, title, or answer key as authoritative.
    return res.status(403).json({ error: 'Penyimpanan nilai langsung tidak diizinkan. Kerjakan latihan resmi agar nilai dihitung dan disimpan oleh server.' });
  }
  if (action === 'add_task') {
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 40) : 'Belajar';
    const dueDate = typeof body.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date) ? body.due_date : null;
    if (!title) return res.status(400).json({ error: 'Judul jadwal wajib diisi.' });
    const result = await db.query(
      'INSERT INTO student_tasks (user_id, title, category, due_date) VALUES ($1, $2, $3, $4) RETURNING id, title, category, due_date, completed, created_at',
      [userId, title, category, dueDate]
    );
    return res.status(201).json({ ok: true, task: result.rows[0] });
  }
  if (action === 'toggle_task') {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID jadwal tidak valid.' });
    const result = await db.query(
      'UPDATE student_tasks SET completed = NOT completed, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING id, title, category, due_date, completed',
      [id, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    return res.json({ ok: true, task: result.rows[0] });
  }
  return res.status(400).json({ error: 'Aksi tidak dikenal.' });
}