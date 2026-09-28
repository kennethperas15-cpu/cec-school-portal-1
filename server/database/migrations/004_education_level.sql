-- 004: education level on students ( backing the student-only Register page ).
-- Re-runnable on PostgreSQL (Supabase).
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS education_level TEXT NOT NULL DEFAULT 'college'
  CHECK (education_level IN ('college', 'shs', 'hs', 'elementary'));
