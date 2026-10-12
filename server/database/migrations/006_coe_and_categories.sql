-- 006: announcement categories + COE (Certificate of Enrollment) requests.
-- Re-runnable on PostgreSQL (Supabase).
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General'
  CHECK (category IN ('General', 'Urgent', 'Events'));

CREATE TABLE IF NOT EXISTS coe_requests (
  id CHAR(36) PRIMARY KEY,
  transaction_no VARCHAR(20) NOT NULL UNIQUE,
  user_id CHAR(36),
  full_name VARCHAR(200) NOT NULL,
  program VARCHAR(150),
  year_level SMALLINT,
  purpose VARCHAR(255) NOT NULL DEFAULT 'Enrollment',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'rejected')),
  decided_by CHAR(36),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_coe_txn ON coe_requests(transaction_no);
CREATE INDEX IF NOT EXISTS idx_coe_status ON coe_requests(status);
