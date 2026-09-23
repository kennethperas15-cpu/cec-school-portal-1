ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL;

INSERT IGNORE INTO system_config (config_key, config_value, is_public) VALUES
  ('school_year', '2026–2027', TRUE),
  ('semester', '1st Semester', TRUE);