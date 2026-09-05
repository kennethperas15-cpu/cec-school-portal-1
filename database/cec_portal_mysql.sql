-- cec_portal_mysql.sql • CEC Portal MySQL
-- 32 tables • share link 146dfc45 converted
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('student','teacher','admin') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- + 31 more tables: students, teachers, messages, conversations...