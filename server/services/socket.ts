import { WebSocketServer, WebSocket } from 'ws';
import { Database } from 'drizzle-orm';
import type * as schema from '@shared/schema';

// Store connected clients by user ID
const clients: Map<number, WebSocket> = new Map();

// Setup WebSocket server
export function setupWebSocketServer(wss: WebSocketServer, db: Database<typeof schema>): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    
    let userId: number | null = null;
    
    // Handle messages from clients
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle authentication
        if (data.type === 'authenticate') {
          userId = data.data.userId;
          clients.set(userId, ws);
          console.log(`User ${userId} authenticated`);
          
          // Send confirmation to client
          ws.send(JSON.stringify({
            type: 'authentication_success',
            data: { userId }
          }));
        }
        
        // Handle typing status
        if (data.type === 'typing_status') {
          // Broadcast typing status to all clients
          broadcastToClients(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
      if (userId) {
        clients.delete(userId);
      }
    });
    
    // Send initial message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to OmniConnect WebSocket server'
    }));
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
