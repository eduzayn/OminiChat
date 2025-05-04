import { WebSocketServer, WebSocket } from 'ws';
import { drizzle } from 'drizzle-orm/pg-pool';
import * as schema from '@shared/schema';

// Store connected clients by user ID
const clients: Map<number, WebSocket> = new Map();

// Setup WebSocket server
export function setupWebSocketServer(wss: WebSocketServer, db: ReturnType<typeof drizzle>): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    
    let userId: number | null = null;
    let userRole: string | null = null;
    
    // Handle messages from clients
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        const messageType = data.type;
        const messageData = data.data || {};
        
        // Handle authentication
        if (messageType === 'authenticate') {
          userId = messageData.userId;
          userRole = messageData.role;
          clients.set(userId, ws);
          console.log(`User ${userId} (${userRole}) authenticated`);
          
          // Send confirmation to client
          ws.send(JSON.stringify({
            type: 'authentication_success',
            data: { userId, userRole }
          }));
          
          // Send online status to other users
          broadcastToClients({
            type: 'user_status',
            data: {
              userId,
              isOnline: true,
              timestamp: new Date().toISOString()
            }
          });
          
          // TODO: Update user status in database
          try {
            await db.update(schema.users)
              .set({ 
                isOnline: true,
                lastSeen: new Date()
              })
              .where(schema.users.id.equals(userId))
              .execute();
          } catch (err) {
            console.error('Error updating user online status:', err);
          }
        }
        
        // Handle conversation events
        else if (messageType === 'conversation_opened') {
          console.log(`User ${userId} opened conversation ${messageData.conversationId}`);
          
          // Notify other agent(s) that this conversation is being viewed
          broadcastToClients({
            type: 'conversation_status',
            data: {
              conversationId: messageData.conversationId,
              status: 'active',
              viewingAgentId: userId,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        else if (messageType === 'conversation_closed') {
          console.log(`User ${userId} closed conversation ${messageData.conversationId}`);
          
          // Notify other clients
          broadcastToClients({
            type: 'conversation_status',
            data: {
              conversationId: messageData.conversationId,
              status: 'inactive',
              viewingAgentId: null,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Handle typing status
        else if (messageType === 'typing_status') {
          // Broadcast typing status to all clients
          broadcastToClients({
            type: 'typing_status',
            data: {
              conversationId: messageData.conversationId,
              isTyping: messageData.isTyping,
              isAgent: messageData.isAgent,
              agentId: messageData.agentId,
              agentName: messageData.agentName,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Handle new notifications
        else if (messageType === 'notification') {
          // Route notification to specific user or broadcast
          if (messageData.targetUserId) {
            sendToUser(messageData.targetUserId, {
              type: 'notification',
              data: messageData
            });
          } else {
            broadcastToClients({
              type: 'notification',
              data: messageData
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
      if (userId) {
        // Update user status
        broadcastToClients({
          type: 'user_status',
          data: {
            userId,
            isOnline: false,
            timestamp: new Date().toISOString()
          }
        });
        
        // Remove from active clients
        clients.delete(userId);
        
        // Update database
        try {
          db.update(schema.users)
            .set({ 
              isOnline: false,
              lastSeen: new Date()
            })
            .where(schema.users.id.equals(userId))
            .execute()
            .catch(err => console.error('Error updating user offline status:', err));
        } catch (err) {
          console.error('Error updating user offline status:', err);
        }
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send initial welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Conectado ao servidor OmniConnect. Aguardando autenticação...'
    }));
  });
  
  // Keep clients alive with ping/pong
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);
  
  // Clean up on server close
  wss.on('close', () => {
    clearInterval(interval);
    clients.clear();
  });
  
  console.log('WebSocket server initialized');
}

// Broadcast message to all connected clients
export function broadcastToClients(data: any): void {
  clients.forEach((client, userId) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Send message to specific user
export function sendToUser(userId: number, data: any): void {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

// Get active clients count
export function getActiveClientsCount(): number {
  return clients.size;
}

// Check if user is connected
export function isUserConnected(userId: number): boolean {
  const client = clients.get(userId);
  return client !== undefined && client.readyState === WebSocket.OPEN;
}
