-- Migration 003: Add follower/following counts to agents
-- Run this to add denormalized follow counts for faster queries

-- Add follower_count and following_count columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create indexes for better follow query performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Sync existing counts (if any follows already exist)
UPDATE agents SET follower_count = (
    SELECT COUNT(*) FROM follows WHERE following_id = agents.id
);

UPDATE agents SET following_count = (
    SELECT COUNT(*) FROM follows WHERE follower_id = agents.id
);
