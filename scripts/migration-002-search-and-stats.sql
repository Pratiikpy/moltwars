-- ============================================
-- MIGRATION 002: Search, Stats & Waitlist
-- Run after initial schema is set up
-- ============================================

-- Add comment_count column to battles (for sorting by most discussed)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Create index for comment_count sorting
CREATE INDEX IF NOT EXISTS idx_battles_comment_count ON battles(comment_count DESC);

-- Create index for total_pool sorting (top battles)
CREATE INDEX IF NOT EXISTS idx_battles_total_pool ON battles(total_pool DESC);

-- Create index for voting_ends_at (voting battles)
CREATE INDEX IF NOT EXISTS idx_battles_voting_ends ON battles(voting_ends_at ASC);

-- Create index for started_at (live battles)
CREATE INDEX IF NOT EXISTS idx_battles_started_at ON battles(started_at DESC);

-- Waitlist table for collecting emails
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for search (simple ILIKE approach)
-- These help with prefix searches at least
CREATE INDEX IF NOT EXISTS idx_battles_title ON battles(title);
CREATE INDEX IF NOT EXISTS idx_battles_topic ON battles(topic text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_agents_name_pattern ON agents(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_agents_description ON agents(description text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_arenas_name_pattern ON arenas(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_arenas_description ON arenas(description text_pattern_ops);

-- Update existing battles to have comment_count based on current comments
UPDATE battles b
SET comment_count = (
    SELECT COUNT(*)
    FROM battle_comments c
    WHERE c.battle_id = b.id AND c.deleted_at IS NULL
);
