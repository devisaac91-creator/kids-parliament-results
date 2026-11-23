-- Run once in the Neon SQL Editor after the initial schema script.
-- The app's class promotion workflow needs a distinct graduated state.
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students
  ADD CONSTRAINT students_status_check
  CHECK (status IN ('active', 'withdrawn', 'graduated'));

-- Exam periods are created once per calendar month by the app.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_periods_month ON exam_periods(month);

-- The original schema's idx_scores_lookup references scores.class_id, which does not exist.
DROP INDEX IF EXISTS idx_scores_lookup;
CREATE INDEX IF NOT EXISTS idx_scores_lookup ON scores(period_id, subject_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);

-- Durable throttling for public parent lookups and sign-in attempts.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket VARCHAR(32) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  PRIMARY KEY (bucket, key_hash)
);
