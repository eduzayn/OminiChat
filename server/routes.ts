import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { db } from "@db";
import { registerAuthRoutes } from "./handlers/auth";
import { registerConversationRoutes } from "./handlers/conversations";
import { registerContactRoutes } from "./handlers/contacts";
import { registerChannelRoutes } from "./handlers/channels";
import { registerPaymentRoutes } from "./handlers/payments";
import { setupWebSocketServer } from "./services/socket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Prefix all routes with /api
  const apiPrefix = "/api";
  
  // Register all routes
  registerAuthRoutes(app, apiPrefix);
  registerConversationRoutes(app, apiPrefix);
  registerContactRoutes(app, apiPrefix);
  registerChannelRoutes(app, apiPrefix);
  registerPaymentRoutes(app, apiPrefix);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Setup WebSocket handlers
  setupWebSocketServer(wss, db);

  return httpServer;
}
