CREATE TABLE practice_quizzes (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Akademik',
  description TEXT NOT NULL DEFAULT '',
  week_label TEXT NOT NULL DEFAULT '',
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 1 AND 240),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT practice_quizzes_date_check CHECK (week_end >= week_start),
  CONSTRAINT practice_quizzes_questions_check CHECK (jsonb_typeof(questions) = 'array')
);
CREATE INDEX idx_practice_quizzes_public_dates ON practice_quizzes (is_published, week_start, week_end);