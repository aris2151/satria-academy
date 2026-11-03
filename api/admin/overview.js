import { db } from '../../server/db.js';

export const access = 'admin';
export const methods = ['GET'];

export default async function (req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak didukung.' });
  const [students, attempts, quizzes, schedules, materials, inquiries, latestAttempts, latestStudents] = await Promise.all([
    db.query("SELECT COUNT(*)::int AS count FROM student_profiles WHERE NULLIF(trim(full_name),'') IS NOT NULL"),
    db.query('SELECT COUNT(*)::int AS count FROM quiz_attempts'),
    db.query('SELECT COUNT(*)::int AS count FROM practice_quizzes WHERE is_published=true'),
    db.query('SELECT COUNT(*)::int AS count FROM recruitment_schedule WHERE is_published=true'),
    db.query('SELECT COUNT(*)::int AS count FROM learning_materials WHERE is_published=true'),
    db.query('SELECT COUNT(*)::int AS count FROM admissions_inquiries'),
    db.query('SELECT quiz_title, score, total, created_at FROM quiz_attempts ORDER BY created_at DESC LIMIT 8'),
    db.query("SELECT full_name, target_path, city, updated_at FROM student_profiles WHERE NULLIF(trim(full_name),'') IS NOT NULL ORDER BY updated_at DESC LIMIT 8")
  ]);
  return res.json({
    metrics: {
      students: students.rows[0]?.count ?? 0,
      attempts: attempts.rows[0]?.count ?? 0,
      published_quizzes: quizzes.rows[0]?.count ?? 0,
      published_schedules: schedules.rows[0]?.count ?? 0,
      published_materials: materials.rows[0]?.count ?? 0,
      inquiries: inquiries.rows[0]?.count ?? 0
    },
    latest_attempts: latestAttempts.rows,
    latest_students: latestStudents.rows,
    note: 'Form minat disimpan setelah calon siswa memberikan persetujuan. Gunakan data hanya untuk menindaklanjuti konsultasi; jumlah siswa berasal dari profil akun yang terisi.'
  });
}