-- Schema do Jahint.Studies (MariaDB/MySQL)
-- Executado pelo script `npm run db:setup` (src/setup/migrate.js).
-- Os ON DELETE CASCADE reproduzem a limpeza em cascata que o frontend
-- fazia na mão: excluir um ano remove semestres, aulas, anotações,
-- trabalhos e provas ligados a ele.

CREATE TABLE IF NOT EXISTS users (
  id                 CHAR(24)      NOT NULL PRIMARY KEY,
  full_name          VARCHAR(120)  NOT NULL,
  nickname           VARCHAR(60)   NULL,
  email              VARCHAR(160)  NOT NULL UNIQUE,
  password_hash      VARCHAR(100)  NOT NULL,
  age                TINYINT UNSIGNED NULL,
  institution        VARCHAR(120)  NULL,
  course             VARCHAR(120)  NULL,
  avatar_path        VARCHAR(255)  NULL,
  active_semester_id CHAR(24)      NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS years (
  id            CHAR(24)  NOT NULL PRIMARY KEY,
  user_id       CHAR(24)  NOT NULL,
  number        TINYINT   NOT NULL,
  calendar_year SMALLINT  NULL,
  CONSTRAINT fk_years_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_years_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS semesters (
  id      CHAR(24) NOT NULL PRIMARY KEY,
  year_id CHAR(24) NOT NULL,
  number  TINYINT  NOT NULL,
  CONSTRAINT fk_semesters_year FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE,
  UNIQUE KEY uq_semester (year_id, number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FK do "semestre atual" do usuário (criada depois porque users vem antes de semesters)
ALTER TABLE users
  ADD CONSTRAINT fk_users_active_semester
  FOREIGN KEY (active_semester_id) REFERENCES semesters(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS classes (
  id          CHAR(24)     NOT NULL PRIMARY KEY,
  semester_id CHAR(24)     NOT NULL,
  name        VARCHAR(160) NOT NULL,
  professor   VARCHAR(120) NULL,
  color       CHAR(7)      NULL,
  CONSTRAINT fk_classes_semester FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  INDEX idx_classes_semester (semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_slots (
  id         INT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id   CHAR(24)  NOT NULL,
  day        TINYINT   NOT NULL,   -- 0=Domingo … 6=Sábado
  start_time TIME      NOT NULL,
  end_time   TIME      NOT NULL,
  CONSTRAINT fk_slots_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_slots_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
  id         CHAR(24)     NOT NULL PRIMARY KEY,
  class_id   CHAR(24)     NOT NULL,
  title      VARCHAR(200) NOT NULL,
  note_date  DATE         NULL,
  content    LONGTEXT     NULL,    -- JSON do editor TipTap
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_notes_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS works (
  id         CHAR(24)     NOT NULL PRIMARY KEY,
  class_id   CHAR(24)     NOT NULL,
  title      VARCHAR(200) NOT NULL,
  type       ENUM('tarefa','trabalho') NOT NULL DEFAULT 'tarefa',
  due_date   DATE         NULL,
  delivery   VARCHAR(80)  NULL,
  progress   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_works_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_works_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_members (
  id      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  work_id CHAR(24)     NOT NULL,
  name    VARCHAR(120) NOT NULL,
  CONSTRAINT fk_members_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  INDEX idx_members_work (work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_tabs (
  id       CHAR(24)     NOT NULL PRIMARY KEY,
  work_id  CHAR(24)     NOT NULL,
  title    VARCHAR(120) NOT NULL,
  position TINYINT      NOT NULL DEFAULT 0,
  content  LONGTEXT     NULL,    -- JSON do editor TipTap
  CONSTRAINT fk_tabs_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  INDEX idx_tabs_work (work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_attachments (
  id         CHAR(24)     NOT NULL PRIMARY KEY,
  work_id    CHAR(24)     NOT NULL,
  file_name  VARCHAR(255) NOT NULL,  -- nome original do arquivo
  file_path  VARCHAR(255) NOT NULL,  -- caminho no disco do servidor
  size_bytes INT UNSIGNED NULL,
  mime_type  VARCHAR(120) NULL,
  CONSTRAINT fk_attachments_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  INDEX idx_attachments_work (work_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exams (
  id        CHAR(24)    NOT NULL PRIMARY KEY,
  class_id  CHAR(24)    NOT NULL,
  label     VARCHAR(60) NOT NULL,
  exam_date DATE        NOT NULL,
  exam_time TIME        NULL,
  topics    TEXT        NULL,
  CONSTRAINT fk_exams_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_exams_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
