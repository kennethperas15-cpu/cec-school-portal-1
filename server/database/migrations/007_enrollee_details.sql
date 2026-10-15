-- 007: DepEd-style enrollment profile payload on applications.
-- Re-runnable on PostgreSQL (Supabase).
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS enrollee_details JSONB;
