-- users_schema.sql
-- password is nullable: OAuth users (Google/GitHub) do not have one
CREATE TABLE IF NOT EXISTS users (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    name     VARCHAR(100),
    email    VARCHAR(255) NOT NULL,
    password VARCHAR(255),                -- BCrypt hash only; NULL for OAuth accounts
    provider VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',  -- LOCAL | GOOGLE | GITHUB
    PRIMARY KEY (id),
    CONSTRAINT unique_email UNIQUE (email)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- MIGRATION: run once on an existing DB that has plaintext passwords.
-- After running, restart the backend — the auto-migration in AuthService
-- will re-encode each user's password on their next login.
-- Alternatively, truncate the table and re-register (cleanest for dev):
-- ──────────────────────────────────────────────────────────────────────────────
-- Option A: add missing columns to existing table (run in MySQL Workbench / CLI)
-- ALTER TABLE users
--     ADD COLUMN IF NOT EXISTS name     VARCHAR(100),
--     ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
--     MODIFY COLUMN password VARCHAR(255) NULL;

-- Option B: hard reset for dev (IRREVERSIBLE)
-- TRUNCATE TABLE users;

-- ──────────────────────────────────────────────────────────────────────────────
-- Study Sessions (Phase 1 migration)
-- Hibernate will auto-create this via ddl-auto=update.
-- Run manually only if you need the index before the first boot.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    user_id           BIGINT       NOT NULL,
    subject_id        BIGINT       NOT NULL,
    duration_minutes  INT          NOT NULL,
    date              DATE         NOT NULL,
    notes             VARCHAR(500),
    PRIMARY KEY (id),
    CONSTRAINT fk_ss_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_ss_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_study_user_date (user_id, date)
);