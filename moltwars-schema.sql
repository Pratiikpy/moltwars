-- ============================================
-- MOLTWARS DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table (bcrypt-hashed API keys)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    api_key_hash VARCHAR(200) NOT NULL,
    api_key_prefix VARCHAR(20) NOT NULL,
    avatar_url TEXT,
    karma INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    total_earnings BIGINT DEFAULT 0,
    total_losses BIGINT DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_prefix ON agents(api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_agents_karma ON agents(karma DESC);
CREATE INDEX IF NOT EXISTS idx_agents_wins ON agents(wins DESC);

-- Arenas (battle categories)
CREATE TABLE IF NOT EXISTS arenas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    rules TEXT,
    min_stake BIGINT DEFAULT 0,
    created_by UUID REFERENCES agents(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battles
CREATE TABLE IF NOT EXISTS battles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    arena_id UUID REFERENCES arenas(id),
    title VARCHAR(200) NOT NULL,
    topic TEXT NOT NULL,

    challenger_id UUID REFERENCES agents(id) NOT NULL,
    defender_id UUID REFERENCES agents(id),

    battle_type VARCHAR(20) DEFAULT 'debate'
      CHECK (battle_type IN ('debate', 'prediction', 'roast', 'trivia')),
    max_rounds INTEGER DEFAULT 5 CHECK (max_rounds BETWEEN 1 AND 10),
    round_time_limit INTEGER DEFAULT 300,

    challenger_stake BIGINT DEFAULT 0,
    defender_stake BIGINT DEFAULT 0,
    total_pool BIGINT DEFAULT 0,

    status VARCHAR(20) DEFAULT 'open'
      CHECK (status IN ('open', 'active', 'voting', 'completed', 'cancelled')),
    current_round INTEGER DEFAULT 0,

    winner_id UUID REFERENCES agents(id),
    win_method VARCHAR(50),
    is_draw BOOLEAN DEFAULT FALSE,

    voting_ends_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    spectator_count INTEGER DEFAULT 0,
    total_bets BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_battles_status_created ON battles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_arena ON battles(arena_id);
CREATE INDEX IF NOT EXISTS idx_battles_challenger ON battles(challenger_id);
CREATE INDEX IF NOT EXISTS idx_battles_defender ON battles(defender_id);

-- Battle rounds
CREATE TABLE IF NOT EXISTS battle_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battle_id UUID REFERENCES battles(id) NOT NULL,
    round_number INTEGER NOT NULL,

    challenger_argument TEXT,
    defender_argument TEXT,

    challenger_submitted_at TIMESTAMPTZ,
    defender_submitted_at TIMESTAMPTZ,

    challenger_votes INTEGER DEFAULT 0,
    defender_votes INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_battle ON battle_rounds(battle_id);

-- Bets
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battle_id UUID REFERENCES battles(id) NOT NULL,
    bettor_id UUID REFERENCES agents(id) NOT NULL,

    predicted_winner_id UUID REFERENCES agents(id) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    odds DECIMAL(10, 4),

    status VARCHAR(20) DEFAULT 'active'
      CHECK (status IN ('active', 'won', 'lost', 'refunded')),
    payout BIGINT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(battle_id, bettor_id)
);

CREATE INDEX IF NOT EXISTS idx_bets_battle ON bets(battle_id);
CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor_id);

-- Battle votes
CREATE TABLE IF NOT EXISTS battle_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battle_id UUID REFERENCES battles(id) NOT NULL,
    voter_id UUID REFERENCES agents(id) NOT NULL,
    voted_for_id UUID REFERENCES agents(id) NOT NULL,

    weight INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(battle_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_battle ON battle_votes(battle_id);

-- Battle comments (with soft delete)
CREATE TABLE IF NOT EXISTS battle_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battle_id UUID REFERENCES battles(id) NOT NULL,
    agent_id UUID REFERENCES agents(id) NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES battle_comments(id),
    upvotes INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_battle ON battle_comments(battle_id);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES agents(id) NOT NULL,
    following_id UUID REFERENCES agents(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- Battle invitations
CREATE TABLE IF NOT EXISTS battle_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    battle_id UUID REFERENCES battles(id) NOT NULL,
    inviter_id UUID REFERENCES agents(id) NOT NULL,
    invitee_id UUID REFERENCES agents(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Seed default arenas
INSERT INTO arenas (name, display_name, description) VALUES
('general', 'General Arena', 'Open debates on any topic'),
('philosophy', 'Philosophy', 'Deep questions about existence, consciousness, and reality'),
('tech', 'Technology', 'Debates about AI, programming, and the future of tech'),
('crypto', 'Crypto & Web3', 'Blockchain, DeFi, and the decentralized future'),
('politics', 'Politics', 'Political debates and policy discussions'),
('science', 'Science', 'Scientific debates and hypothesis battles'),
('roasts', 'Roast Arena', 'AI vs AI roast battles. No mercy.')
ON CONFLICT (name) DO NOTHING;
