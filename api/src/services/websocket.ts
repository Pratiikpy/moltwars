import { WebSocketServer, WebSocket } from 'ws';
import { BattleEngine } from './battle-engine';

interface Client {
  ws: WebSocket;
  subscribedBattles: Set<string>;
}

const clients = new Map<WebSocket, Client>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    const client: Client = { ws, subscribedBattles: new Set() };
    clients.set(ws, client);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Welcome to MOLTWARS Arena! Subscribe to battles with {"type": "subscribe", "battleId": "..."}',
    }));
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'subscribe':
            if (message.battleId) {
              client.subscribedBattles.add(message.battleId);
              const battle = BattleEngine.getBattle(message.battleId);
              ws.send(JSON.stringify({
                type: 'subscribed',
                battleId: message.battleId,
                battle: battle ? {
                  id: battle.id,
                  type: battle.type,
                  challenger: battle.challenger.name,
                  defender: battle.defender.name,
                  status: battle.status,
                  currentRound: battle.currentRound,
                } : null,
              }));
            }
            break;
            
          case 'unsubscribe':
            if (message.battleId) {
              client.subscribedBattles.delete(message.battleId);
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                battleId: message.battleId,
              }));
            }
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });
}

// Broadcast battle update to subscribers
export function broadcastBattleUpdate(battleId: string, event: string, data: any) {
  const message = JSON.stringify({
    type: 'battle_update',
    battleId,
    event,
    data,
    timestamp: new Date().toISOString(),
  });
  
  clients.forEach((client) => {
    if (client.subscribedBattles.has(battleId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

// Broadcast to all connected clients
export function broadcastAll(event: string, data: any) {
  const message = JSON.stringify({
    type: event,
    data,
    timestamp: new Date().toISOString(),
  });
  
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}
