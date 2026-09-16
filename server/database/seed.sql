USE cec_portal;

INSERT INTO roles (name, description) VALUES
  ('admin', 'System administrator'),
  ('teacher', 'Teacher or faculty member'),
  ('student', 'Student')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO permissions (name, description) VALUES
  ('manage_users', 'Create and manage user accounts'),
  ('manage_academics', 'Manage courses, grades, and attendance'),
  ('manage_enrollment', 'Review and approve enrollment'),
  ('view_reports', 'View system reports'),
  ('use_portal', 'Access the school portal')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('teacher', 'student') AND p.name = 'use_portal';

INSERT INTO system_config (config_key, config_value, is_public) VALUES
  ('school_name', 'CEC School Portal', TRUE),
  ('current_school_year', '2026-2027', TRUE),
  ('current_semester', '1', TRUE)
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), is_public = VALUES(is_public);

-- Create users through the application so passwords are bcrypt-hashed.
