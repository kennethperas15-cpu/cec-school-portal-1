-- 005: over-the-counter enrollment flow on enrollment_applications.
-- Re-runnable on PostgreSQL (Supabase).
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS payment_reference_no VARCHAR(60);
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
  CHECK (payment_status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'));
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS student_status TEXT NOT NULL DEFAULT 'PROVISIONAL'
  CHECK (student_status IN ('PROVISIONAL', 'ENROLLED'));
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS assigned_school_id VARCHAR(7);
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS school_year VARCHAR(20);
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS semester SMALLINT;
