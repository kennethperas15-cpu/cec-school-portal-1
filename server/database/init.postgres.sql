-- CEC School Portal database — PostgreSQL (Supabase)
-- Paste into the Supabase SQL editor and run once. Re-runnable.
-- Replaces server/database/init.sql + migrations/003 for Postgres.

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  role_id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  avatar_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(last_name, first_name);

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollment_applications (
  id CHAR(36) PRIMARY KEY,
  google_subject VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  program VARCHAR(150) NOT NULL,
  year_level SMALLINT NOT NULL,
  phone VARCHAR(30),
  requested_role TEXT NOT NULL DEFAULT 'student' CHECK (requested_role IN ('student','teacher','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  payment_reference_no VARCHAR(60),
  payment_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (payment_status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
  student_status TEXT NOT NULL DEFAULT 'PROVISIONAL' CHECK (student_status IN ('PROVISIONAL', 'ENROLLED')),
  assigned_school_id VARCHAR(7),
  school_year VARCHAR(20),
  semester SMALLINT,
  user_id CHAR(36) NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_email ON enrollment_applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON enrollment_applications(status);

CREATE TABLE IF NOT EXISTS account_activation_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  student_number VARCHAR(30) NOT NULL UNIQUE,
  department_id BIGINT,
  program VARCHAR(150),
  year_level SMALLINT,
  education_level TEXT NOT NULL DEFAULT 'college' CHECK (education_level IN ('college', 'shs', 'hs', 'elementary')),
  date_of_birth DATE,
  address VARCHAR(500),
  guardian_name VARCHAR(200),
  guardian_phone VARCHAR(30),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','graduated','transferred')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  employee_number VARCHAR(30) NOT NULL UNIQUE,
  department_id BIGINT,
  specialization VARCHAR(150),
  employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active','inactive','on_leave')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS curricula (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id BIGINT NOT NULL,
  name VARCHAR(150) NOT NULL,
  version VARCHAR(30) NOT NULL,
  effective_year SMALLINT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  units DECIMAL(4,1) NOT NULL DEFAULT 3.0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS curriculum_subjects (
  curriculum_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  year_level SMALLINT,
  semester SMALLINT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (curriculum_id, subject_id),
  FOREIGN KEY (curriculum_id) REFERENCES curricula(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id BIGINT NOT NULL,
  teacher_id CHAR(36),
  code VARCHAR(30) NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  semester SMALLINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  UNIQUE (subject_id, code, school_year, semester)
);

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  building VARCHAR(100),
  room_number VARCHAR(30) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  UNIQUE (building, room_number)
);

CREATE TABLE IF NOT EXISTS sections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  year_level SMALLINT,
  UNIQUE (name, school_year)
);

CREATE TABLE IF NOT EXISTS schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL,
  room_id BIGINT,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  semester SMALLINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','enrolled','dropped')),
  submitted_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  approved_by CHAR(36) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, school_year, semester)
);

CREATE TABLE IF NOT EXISTS enrollment_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enrollment_id CHAR(36) NOT NULL,
  course_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE (enrollment_id, course_id)
);

CREATE TABLE IF NOT EXISTS grades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  course_id BIGINT NOT NULL,
  grade DECIMAL(5,2),
  remarks VARCHAR(255),
  submitted_by CHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  course_id BIGINT NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  notes VARCHAR(255),
  recorded_by CHAR(36),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (student_id, course_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  points DECIMAL(8,2),
  created_by CHAR(36),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assignment_id BIGINT NOT NULL,
  student_id CHAR(36) NOT NULL,
  file_url VARCHAR(500),
  content TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score DECIMAL(8,2),
  feedback TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','teachers','admins')),
  published_by CHAR(36),
  published_at TIMESTAMPTZ,
  FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  document_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_books (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isbn VARCHAR(20) UNIQUE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  publisher VARCHAR(255),
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS borrow_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id BIGINT NOT NULL,
  borrower_id CHAR(36) NOT NULL,
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed','returned','overdue')),
  FOREIGN KEY (book_id) REFERENCES library_books(id),
  FOREIGN KEY (borrower_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  school_year VARCHAR(20) NOT NULL,
  semester SMALLINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','void')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  fee_id BIGINT,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  reference_number VARCHAR(60) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','bank_transfer','online','card')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','refunded')),
  paid_at TIMESTAMPTZ NULL,
  verified_by CHAR(36),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scholarships (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  percentage DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50),
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  parameters JSONB,
  generated_by CHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS system_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (config_key, config_value, is_public) VALUES
  ('school_year', '2026–2027', TRUE),
  ('semester', '1st Semester', TRUE)
ON CONFLICT (config_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS portal_items (
  id CHAR(36) PRIMARY KEY,
  portal VARCHAR(20) NOT NULL,
  module VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail TEXT,
  status VARCHAR(60) DEFAULT 'New',
  owner VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_module ON portal_items(portal, module);
