-- CEC School Portal seed — PostgreSQL (Supabase). Run after init.postgres.sql.

INSERT INTO roles (name, description) VALUES
  ('admin', 'System administrator'),
  ('teacher', 'Teacher or faculty member'),
  ('student', 'Student')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO permissions (name, description) VALUES
  ('manage_users', 'Create and manage user accounts'),
  ('manage_academics', 'Manage courses, grades, and attendance'),
  ('manage_enrollment', 'Review and approve enrollment'),
  ('view_reports', 'View system reports'),
  ('use_portal', 'Access the school portal')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('teacher', 'student') AND p.name = 'use_portal'
ON CONFLICT DO NOTHING;

INSERT INTO system_config (config_key, config_value, is_public) VALUES
  ('school_name', 'CEC School Portal', TRUE),
  ('current_school_year', '2026-2027', TRUE),
  ('current_semester', '1', TRUE)
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, is_public = EXCLUDED.is_public;

-- Create users through the application so passwords are bcrypt-hashed.
