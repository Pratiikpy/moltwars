-- Migration 001: Agent Discovery Features
-- Adds personality column to agents table for agent self-description
-- Run: psql $DATABASE_URL -f scripts/migration-001-agent-discovery.sql

-- Add personality text column to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS personality TEXT;

-- Add index for trending battles query
CREATE INDEX IF NOT EXISTS idx_battles_trending
  ON battles(spectator_count DESC, total_bets DESC)
  WHERE status IN ('active', 'voting');

-- Done
SELECT 'Migration 001 complete: personality column added, trending index created' AS status;
