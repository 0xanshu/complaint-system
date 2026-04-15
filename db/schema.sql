-- Whistle complaint system schema (normalized V2)
-- MySQL 8+

CREATE DATABASE IF NOT EXISTS whistle_db;
USE whistle_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS vw_complaint_dashboard;
DROP TRIGGER IF EXISTS trg_complaints_status_audit;
DROP TRIGGER IF EXISTS trg_users_validate_insert;
DROP TRIGGER IF EXISTS trg_users_validate_update;
DROP TRIGGER IF EXISTS trg_complaints_validate_insert;
DROP TRIGGER IF EXISTS trg_complaints_validate_update;
DROP TRIGGER IF EXISTS trg_evidences_validate_insert;

DROP TABLE IF EXISTS complaint_status_history;
DROP TABLE IF EXISTS complaint_messages;
DROP TABLE IF EXISTS complaint_evidences;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS verification_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS complaint_statuses;
DROP TABLE IF EXISTS complaint_priorities;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS complaint_categories;
DROP TABLE IF EXISTS institutions;

SET FOREIGN_KEY_CHECKS = 1;

-- Master table for institutions
CREATE TABLE institutions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  institution_name VARCHAR(255) NOT NULL,
  institution_slug VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_institutions_slug (institution_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Core users table (credentials + role + optional institution reference)
CREATE TABLE users (
  id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NULL,
  email VARCHAR(191) NOT NULL,
  emailVerified DATETIME NULL,
  image TEXT NULL,
  password VARCHAR(255) NULL,
  role ENUM('student', 'manager', 'admin') NOT NULL DEFAULT 'student',
  institution_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_institution_id (institution_id),
  CONSTRAINT fk_users_institution FOREIGN KEY (institution_id)
    REFERENCES institutions(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NextAuth adapter table: OAuth/credentials account links
CREATE TABLE accounts (
  id VARCHAR(191) NOT NULL,
  userId VARCHAR(191) NOT NULL,
  type VARCHAR(191) NOT NULL,
  provider VARCHAR(191) NOT NULL,
  providerAccountId VARCHAR(191) NOT NULL,
  refresh_token TEXT NULL,
  access_token TEXT NULL,
  expires_at INT NULL,
  token_type VARCHAR(191) NULL,
  scope TEXT NULL,
  id_token TEXT NULL,
  session_state VARCHAR(191) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_provider_providerAccountId (provider, providerAccountId),
  KEY idx_accounts_userId (userId),
  CONSTRAINT fk_accounts_user FOREIGN KEY (userId)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NextAuth adapter table: DB sessions
CREATE TABLE sessions (
  id VARCHAR(191) NOT NULL,
  sessionToken VARCHAR(191) NOT NULL,
  userId VARCHAR(191) NOT NULL,
  expires DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_sessionToken (sessionToken),
  KEY idx_sessions_userId (userId),
  CONSTRAINT fk_sessions_user FOREIGN KEY (userId)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NextAuth adapter table: email login tokens
CREATE TABLE verification_tokens (
  identifier VARCHAR(191) NOT NULL,
  token VARCHAR(191) NOT NULL,
  expires DATETIME NOT NULL,
  PRIMARY KEY (identifier, token),
  UNIQUE KEY uq_verification_tokens_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lookup tables for normalized complaint dimensions (3NF)
CREATE TABLE complaint_categories (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_complaint_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE departments (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE complaint_priorities (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  rank_weight TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_complaint_priorities_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE complaint_statuses (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_complaint_statuses_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Anonymous alias vault (one row per complaint identity)
CREATE TABLE students (
  alias_id VARCHAR(191) NOT NULL,
  roll_hash CHAR(64) NOT NULL,
  session_token CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (alias_id),
  UNIQUE KEY uq_students_session_token (session_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main complaint records
CREATE TABLE complaints (
  complaint_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  alias_id VARCHAR(191) NOT NULL,
  institution_id BIGINT UNSIGNED NULL,
  category_id SMALLINT UNSIGNED NOT NULL,
  department_id SMALLINT UNSIGNED NOT NULL,
  status_id SMALLINT UNSIGNED NOT NULL,
  priority_id SMALLINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (complaint_id),
  KEY idx_complaints_alias_id (alias_id),
  KEY idx_complaints_institution_id (institution_id),
  KEY idx_complaints_status_id (status_id),
  KEY idx_complaints_priority_id (priority_id),
  KEY idx_complaints_submitted_at (submitted_at),
  CONSTRAINT fk_complaints_student_alias FOREIGN KEY (alias_id)
    REFERENCES students(alias_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_institution FOREIGN KEY (institution_id)
    REFERENCES institutions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_category FOREIGN KEY (category_id)
    REFERENCES complaint_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_department FOREIGN KEY (department_id)
    REFERENCES departments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_status FOREIGN KEY (status_id)
    REFERENCES complaint_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_complaints_priority FOREIGN KEY (priority_id)
    REFERENCES complaint_priorities(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evidence references for each complaint (URL-based attachments)
CREATE TABLE complaint_evidences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  evidence_url TEXT NOT NULL,
  evidence_note VARCHAR(255) NULL,
  uploaded_by_role ENUM('complainant', 'manager') NOT NULL DEFAULT 'complainant',
  uploaded_by_user_id VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_evidences_complaint_id (complaint_id),
  KEY idx_evidences_uploaded_by_user_id (uploaded_by_user_id),
  CONSTRAINT fk_evidences_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(complaint_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_evidences_uploaded_by_user FOREIGN KEY (uploaded_by_user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Anonymous two-way thread between complainant and manager
CREATE TABLE complaint_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  sender_role ENUM('complainant', 'manager') NOT NULL,
  manager_user_id VARCHAR(191) NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_complaint_id (complaint_id),
  KEY idx_messages_manager_user_id (manager_user_id),
  CONSTRAINT fk_messages_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(complaint_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_messages_manager_user FOREIGN KEY (manager_user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger audit table for status transitions
CREATE TABLE complaint_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  old_status_id SMALLINT UNSIGNED NOT NULL,
  new_status_id SMALLINT UNSIGNED NOT NULL,
  changed_by_user_id VARCHAR(191) NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status_history_complaint_id (complaint_id),
  KEY idx_status_history_changed_by (changed_by_user_id),
  CONSTRAINT fk_status_history_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(complaint_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_old_status FOREIGN KEY (old_status_id)
    REFERENCES complaint_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_new_status FOREIGN KEY (new_status_id)
    REFERENCES complaint_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by_user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed lookup rows
INSERT INTO complaint_categories (code, label) VALUES
  ('ACADEMIC_MISCONDUCT', 'Academic Misconduct'),
  ('FACULTY_BEHAVIOR', 'Faculty Behavior'),
  ('INFRASTRUCTURE', 'Infrastructure'),
  ('ADMINISTRATION', 'Administration'),
  ('HARASSMENT', 'Harassment'),
  ('EXAMINATION', 'Examination'),
  ('FINANCIAL', 'Financial'),
  ('OTHER', 'Other');

INSERT INTO departments (code, label) VALUES
  ('COMPUTER_SCIENCE', 'Computer Science'),
  ('ELECTRONICS', 'Electronics'),
  ('MECHANICAL', 'Mechanical'),
  ('CIVIL', 'Civil'),
  ('CHEMICAL', 'Chemical'),
  ('MATHEMATICS', 'Mathematics'),
  ('PHYSICS', 'Physics'),
  ('MANAGEMENT', 'Management'),
  ('LIBRARY', 'Library'),
  ('EXAMINATION_CELL', 'Examination Cell'),
  ('ACCOUNTS', 'Accounts'),
  ('ADMINISTRATION', 'Administration');

INSERT INTO complaint_priorities (code, label, rank_weight) VALUES
  ('low', 'Low', 1),
  ('medium', 'Medium', 2),
  ('high', 'High', 3),
  ('critical', 'Critical', 4);

INSERT INTO complaint_statuses (code, label, is_terminal) VALUES
  ('pending', 'Pending', FALSE),
  ('under_review', 'Under Review', FALSE),
  ('investigating', 'Investigating', FALSE),
  ('resolved', 'Resolved', TRUE),
  ('dismissed', 'Dismissed', TRUE);

DELIMITER $$
CREATE TRIGGER trg_complaints_status_audit
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
  IF OLD.status_id <> NEW.status_id THEN
    INSERT INTO complaint_status_history (
      complaint_id,
      old_status_id,
      new_status_id,
      changed_by_user_id
    ) VALUES (
      NEW.complaint_id,
      OLD.status_id,
      NEW.status_id,
      NULLIF(@app_changed_by_user_id, '')
    );
  END IF;
END$$

-- Data validation BEFORE triggers to enforce data consistency / 1NF atomicity invariants
CREATE TRIGGER trg_users_validate_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF TRIM(NEW.email) = '' OR NEW.email NOT LIKE '%_@__%.__%' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid email address format';
  END IF;
END$$

CREATE TRIGGER trg_users_validate_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF TRIM(NEW.email) = '' OR NEW.email NOT LIKE '%_@__%.__%' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid email address format';
  END IF;
END$$

CREATE TRIGGER trg_complaints_validate_insert
BEFORE INSERT ON complaints
FOR EACH ROW
BEGIN
  IF TRIM(NEW.title) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Complaint title cannot be empty or just whitespace';
  END IF;
  IF TRIM(NEW.description) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Complaint description cannot be empty or just whitespace';
  END IF;
END$$

CREATE TRIGGER trg_complaints_validate_update
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
  IF TRIM(NEW.title) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Complaint title cannot be empty or just whitespace';
  END IF;
  IF TRIM(NEW.description) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Complaint description cannot be empty or just whitespace';
  END IF;
END$$

CREATE TRIGGER trg_evidences_validate_insert
BEFORE INSERT ON complaint_evidences
FOR EACH ROW
BEGIN
  IF TRIM(NEW.evidence_url) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Evidence URL cannot be empty or just whitespace';
  END IF;
END$$

DELIMITER ;

CREATE VIEW vw_complaint_dashboard AS
SELECT
  c.complaint_id,
  c.alias_id,
  c.institution_id,
  i.institution_slug,
  cc.code AS category,
  d.code AS department,
  cs.code AS status,
  cp.code AS priority,
  c.title,
  c.description,
  c.submitted_at,
  c.updated_at
FROM complaints c
LEFT JOIN institutions i ON i.id = c.institution_id
JOIN complaint_categories cc ON cc.id = c.category_id
JOIN departments d ON d.id = c.department_id
JOIN complaint_statuses cs ON cs.id = c.status_id
JOIN complaint_priorities cp ON cp.id = c.priority_id;
