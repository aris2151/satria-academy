CREATE TABLE practice_quiz_tokens (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES practice_quizzes(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Token latihan mingguan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'admin'
);
CREATE INDEX idx_practice_quiz_tokens_active ON practice_quiz_tokens (quiz_id, expires_at) WHERE revoked_at IS NULL;