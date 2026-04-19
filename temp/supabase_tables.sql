# Supabase SQL (run in Supabase SQL Editor)
# Project: Resume Analyzer Pro

CREATE TABLE IF NOT EXISTS public.analyses (
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

CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analyses_username ON public.analyses (username);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);
