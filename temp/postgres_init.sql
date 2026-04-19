-- Resume Analyzer Pro: PostgreSQL bootstrap script
-- Run using psql:
-- psql -U postgres -f "C:/Users/De!!/Desktop/resume/resume-analyzer-pro/backend/temp/postgres_init.sql"

-- 1) Create database (run as superuser/admin)
CREATE DATABASE resume_analyzer;

-- Connect to target DB in psql
\connect resume_analyzer;

-- 2) Create tables
CREATE TABLE IF NOT EXISTS analyses (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    final_score DOUBLE PRECISION NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    skill_score DOUBLE PRECISION NOT NULL,
    missing_skills TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    skill_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_analyses_username ON analyses (username);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at DESC);

-- 4) Optional quick checks
-- SELECT COUNT(*) FROM analyses;
-- SELECT COUNT(*) FROM reviews;
