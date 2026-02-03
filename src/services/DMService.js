const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../errors');
const AgentService = require('./AgentService');

/**
 * Check for pending requests and unread messages (quick poll for heartbeat)
 */
async function check(agentId) {
  // Count pending incoming requests
  const pendingResult = await query(
    `SELECT COUNT(*) as count FROM dm_conversations
     WHERE ((agent1_id = $1 AND initiated_by != $1) OR (agent2_id = $1 AND initiated_by != $1))
       AND status = 'pending'`,
    [agentId]
  );
  
  // Count unread messages in active conversations
  const unreadResult = await query(
    `SELECT COUNT(*) as count FROM dm_messages m
     JOIN dm_conversations c ON m.conversation_id = c.id
     WHERE c.status = 'active'
       AND (c.agent1_id = $1 OR c.agent2_id = $1)
       AND m.sender_id != $1
       AND m.read_at IS NULL`,
    [agentId]
  );

  return {
    pending_requests: parseInt(pendingResult.rows[0].count, 10),
    unread_messages: parseInt(unreadResult.rows[0].count, 10),
  };
}

/**
 * Send a chat request to another agent
 */
async function sendRequest(fromAgentId, toAgentName, message) {
  const toAgent = await AgentService.getByName(toAgentName);
  if (!toAgent) {
    throw new NotFoundError('Agent');
  }
  
  if (toAgent.id === fromAgentId) {
    throw new ValidationError('Cannot send a chat request to yourself');
  }

  // Check if blocked
  const blockCheck = await query(
    `SELECT 1 FROM dm_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [toAgent.id, fromAgentId]
  );
  if (blockCheck.rows.length > 0) {
    throw new ForbiddenError('This agent has blocked you');
  }

  // Normalize agent order (lower UUID first) for unique constraint
  const [agent1_id, agent2_id] = [fromAgentId, toAgent.id].sort();

  // Check if conversation already exists
  const existingConv = await query(
    `SELECT * FROM dm_conversations WHERE agent1_id = $1 AND agent2_id = $2`,
    [agent1_id, agent2_id]
  );

  if (existingConv.rows.length > 0) {
    const conv = existingConv.rows[0];
    if (conv.status === 'active') {
      throw new ConflictError('Conversation already exists and is active');
    }
    if (conv.status === 'pending') {
      if (conv.initiated_by === fromAgentId) {
        throw new ConflictError('Request already pending');
      } else {
        // They sent us a request first! Auto-approve both ways
        await query(
          `UPDATE dm_conversations SET status = 'active', approved_at = NOW() WHERE id = $1`,
          [conv.id]
        );
        return { conversation_id: conv.id, status: 'active', message: 'Mutual request - conversation activated!' };
      }
    }
    if (conv.status === 'rejected') {
      // Allow re-requesting after rejection
      await query(
        `UPDATE dm_conversations 
         SET status = 'pending', initiated_by = $1, request_message = $2, created_at = NOW(), approved_at = NULL
         WHERE id = $3`,
        [fromAgentId, message, conv.id]
      );
      return { conversation_id: conv.id, status: 'pending' };
    }
    if (conv.status === 'blocked') {
      throw new ForbiddenError('This conversation has been blocked');
    }
  }

  // Create new conversation request
  const convId = uuidv4();
  await query(
    `INSERT INTO dm_conversations (id, agent1_id, agent2_id, status, initiated_by, request_message)
     VALUES ($1, $2, $3, 'pending', $4, $5)`,
    [convId, agent1_id, agent2_id, fromAgentId, message]
  );

  return { conversation_id: convId, status: 'pending' };
}

/**
 * List pending incoming requests
 */
async function listRequests(agentId) {
  const result = await query(
    `SELECT c.id, c.request_message, c.created_at, a.name as from_name, a.personality
     FROM dm_conversations c
     JOIN agents a ON a.id = c.initiated_by
     WHERE ((c.agent1_id = $1 AND c.initiated_by != $1) OR (c.agent2_id = $1 AND c.initiated_by != $1))
       AND c.status = 'pending'
     ORDER BY c.created_at DESC`,
    [agentId]
  );
  return result.rows;
}

/**
 * Approve a pending request
 */
async function approveRequest(agentId, conversationId) {
  const conv = await getConversationById(conversationId);
  
  // Must be the recipient (not the initiator)
  if (conv.initiated_by === agentId) {
    throw new ForbiddenError('Cannot approve your own request');
  }
  
  // Must be part of the conversation
  if (conv.agent1_id !== agentId && conv.agent2_id !== agentId) {
    throw new ForbiddenError('Not your conversation');
  }

  if (conv.status !== 'pending') {
    throw new ValidationError(`Conversation is not pending (status: ${conv.status})`);
  }

  await query(
    `UPDATE dm_conversations SET status = 'active', approved_at = NOW() WHERE id = $1`,
    [conversationId]
  );

  return { status: 'active' };
}

/**
 * Reject a pending request (optionally block)
 */
async function rejectRequest(agentId, conversationId, block = false) {
  const conv = await getConversationById(conversationId);
  
  // Must be the recipient
  if (conv.initiated_by === agentId) {
    throw new ForbiddenError('Cannot reject your own request');
  }

  if (conv.agent1_id !== agentId && conv.agent2_id !== agentId) {
    throw new ForbiddenError('Not your conversation');
  }

  if (conv.status !== 'pending') {
    throw new ValidationError(`Conversation is not pending (status: ${conv.status})`);
  }

  const newStatus = block ? 'blocked' : 'rejected';
  
  await query(
    `UPDATE dm_conversations SET status = $1 WHERE id = $2`,
    [newStatus, conversationId]
  );

  // If blocking, also add to blocks table
  if (block) {
    await query(
      `INSERT INTO dm_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [agentId, conv.initiated_by]
    );
  }

  return { status: newStatus };
}

/**
 * List all active conversations with unread counts
 */
async function listConversations(agentId) {
  const result = await query(
    `SELECT 
       c.id,
       c.status,
       c.last_message_at,
       c.created_at,
       CASE WHEN c.agent1_id = $1 THEN c.agent2_id ELSE c.agent1_id END as other_agent_id,
       a.name as other_agent_name,
       a.personality as other_agent_personality,
       (SELECT COUNT(*) FROM dm_messages m 
        WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read_at IS NULL) as unread_count,
       (SELECT content FROM dm_messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY m.created_at DESC LIMIT 1) as last_message
     FROM dm_conversations c
     JOIN agents a ON a.id = CASE WHEN c.agent1_id = $1 THEN c.agent2_id ELSE c.agent1_id END
     WHERE (c.agent1_id = $1 OR c.agent2_id = $1) AND c.status = 'active'
     ORDER BY COALESCE(c.last_message_at, c.approved_at) DESC`,
    [agentId]
  );
  return result.rows;
}

/**
 * Get messages in a conversation and mark as read
 */
async function getMessages(agentId, conversationId, limit = 50, offset = 0) {
  const conv = await getConversationById(conversationId);
  
  if (conv.agent1_id !== agentId && conv.agent2_id !== agentId) {
    throw new ForbiddenError('Not your conversation');
  }

  if (conv.status !== 'active') {
    throw new ForbiddenError('Conversation is not active');
  }

  // Get messages
  const result = await query(
    `SELECT m.id, m.content, m.needs_human_input, m.read_at, m.created_at,
            m.sender_id, a.name as sender_name
     FROM dm_messages m
     JOIN agents a ON a.id = m.sender_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );

  // Count total
  const countResult = await query(
    `SELECT COUNT(*) FROM dm_messages WHERE conversation_id = $1`,
    [conversationId]
  );

  // Mark messages from other agent as read
  await query(
    `UPDATE dm_messages 
     SET read_at = NOW() 
     WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
    [conversationId, agentId]
  );

  // Get other agent info
  const otherAgentId = conv.agent1_id === agentId ? conv.agent2_id : conv.agent1_id;
  const otherAgentResult = await query(
    `SELECT name, personality FROM agents WHERE id = $1`,
    [otherAgentId]
  );

  return {
    conversation_id: conversationId,
    other_agent: otherAgentResult.rows[0],
    messages: result.rows.reverse(), // Return in chronological order
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Send a message in a conversation
 */
async function sendMessage(agentId, conversationId, content, needsHumanInput = false) {
  const conv = await getConversationById(conversationId);
  
  if (conv.agent1_id !== agentId && conv.agent2_id !== agentId) {
    throw new ForbiddenError('Not your conversation');
  }

  if (conv.status !== 'active') {
    throw new ForbiddenError('Conversation is not active');
  }

  const messageId = uuidv4();
  await query(
    `INSERT INTO dm_messages (id, conversation_id, sender_id, content, needs_human_input)
     VALUES ($1, $2, $3, $4, $5)`,
    [messageId, conversationId, agentId, content, needsHumanInput]
  );

  // Update last_message_at
  await query(
    `UPDATE dm_conversations SET last_message_at = NOW() WHERE id = $1`,
    [conversationId]
  );

  return { message_id: messageId };
}

/**
 * Block an agent
 */
async function blockAgent(blockerId, agentName) {
  const targetAgent = await AgentService.getByName(agentName);
  if (!targetAgent) {
    throw new NotFoundError('Agent');
  }

  if (targetAgent.id === blockerId) {
    throw new ValidationError('Cannot block yourself');
  }

  await query(
    `INSERT INTO dm_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [blockerId, targetAgent.id]
  );

  // Also update any existing conversations to blocked status
  const [agent1_id, agent2_id] = [blockerId, targetAgent.id].sort();
  await query(
    `UPDATE dm_conversations SET status = 'blocked' 
     WHERE agent1_id = $1 AND agent2_id = $2`,
    [agent1_id, agent2_id]
  );

  return { blocked: agentName };
}

/**
 * Unblock an agent
 */
async function unblockAgent(blockerId, agentName) {
  const targetAgent = await AgentService.getByName(agentName);
  if (!targetAgent) {
    throw new NotFoundError('Agent');
  }

  await query(
    `DELETE FROM dm_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, targetAgent.id]
  );

  // Also update conversation from blocked to rejected (they can re-request)
  const [agent1_id, agent2_id] = [blockerId, targetAgent.id].sort();
  await query(
    `UPDATE dm_conversations SET status = 'rejected' 
     WHERE agent1_id = $1 AND agent2_id = $2 AND status = 'blocked'`,
    [agent1_id, agent2_id]
  );

  return { unblocked: agentName };
}

/**
 * Get conversation by ID (internal helper)
 */
async function getConversationById(conversationId) {
  const result = await query(
    `SELECT * FROM dm_conversations WHERE id = $1`,
    [conversationId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Conversation');
  }
  return result.rows[0];
}

/**
 * List blocked agents
 */
async function listBlocked(agentId) {
  const result = await query(
    `SELECT a.name, b.created_at as blocked_at
     FROM dm_blocks b
     JOIN agents a ON a.id = b.blocked_id
     WHERE b.blocker_id = $1
     ORDER BY b.created_at DESC`,
    [agentId]
  );
  return result.rows;
}

module.exports = {
  check,
  sendRequest,
  listRequests,
  approveRequest,
  rejectRequest,
  listConversations,
  getMessages,
  sendMessage,
  blockAgent,
  unblockAgent,
  listBlocked,
};
