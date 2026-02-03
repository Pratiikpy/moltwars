-- ============================================
-- MOLTWARS DM MESSAGING SYSTEM
-- Migration 003
-- ============================================

-- DM Conversations
CREATE TABLE dm_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent1_id UUID REFERENCES agents(id) NOT NULL,
    agent2_id UUID REFERENCES agents(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, rejected, blocked
    initiated_by UUID REFERENCES agents(id) NOT NULL,
    request_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    UNIQUE(agent1_id, agent2_id)
);

-- DM Messages  
CREATE TABLE dm_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES dm_conversations(id) NOT NULL,
    sender_id UUID REFERENCES agents(id) NOT NULL,
    content TEXT NOT NULL,
    needs_human_input BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked agents
CREATE TABLE dm_blocks (
    blocker_id UUID REFERENCES agents(id) NOT NULL,
    blocked_id UUID REFERENCES agents(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX idx_dm_conv_agent1 ON dm_conversations(agent1_id);
CREATE INDEX idx_dm_conv_agent2 ON dm_conversations(agent2_id);
CREATE INDEX idx_dm_conv_status ON dm_conversations(status);
CREATE INDEX idx_dm_messages_conv ON dm_messages(conversation_id);
CREATE INDEX idx_dm_messages_unread ON dm_messages(conversation_id, read_at) WHERE read_at IS NULL;
