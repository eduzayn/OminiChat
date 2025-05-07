import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { db } from "@db";
import { registerAuthRoutes } from "./handlers/auth";
import { registerConversationRoutes } from "./handlers/conversations";
import { registerContactRoutes } from "./handlers/contacts";
import { registerChannelRoutes } from "./handlers/channels";
import { registerPaymentRoutes } from "./handlers/payments";
import { registerAIRoutes } from "./handlers/ai";
import { registerMessageTemplateRoutes } from "./handlers/message-templates";
import { registerWebhookRoutes } from "./handlers/webhooks";
import { registerOpportunityRoutes } from "./handlers/opportunities";
import { registerOrganizationRoutes } from "./handlers/organizations";
import { setupWebSocketServer } from "./services/socket";
import { registerRestartSessionRoute } from "./handlers/restart-session";
import { registerWebhookDiagnosticRoute } from "./handlers/webhook-diagnostic";
import { registerWebhookSimulationRoutes } from "./handlers/webhook-simulation";
import { registerMediaTestRoutes } from "./handlers/media-test";


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
  registerAIRoutes(app, apiPrefix);
  registerMessageTemplateRoutes(app, apiPrefix);
  registerWebhookRoutes(app, apiPrefix);
  registerOpportunityRoutes(app, apiPrefix);
  registerOrganizationRoutes(app, apiPrefix);
  registerRestartSessionRoute(app, apiPrefix);
  registerWebhookDiagnosticRoute(app, apiPrefix);
  registerWebhookSimulationRoutes(app, apiPrefix);
  registerMediaTestRoutes(app, apiPrefix);

  
  // Create WebSocket server
  // Configurar WebSocket Server para comunicação em tempo real
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Setup WebSocket handlers
  setupWebSocketServer(wss, db);
  
  // Exportar a instância WebSocketServer e a função de broadcast para usar em outros módulos
  // como os handlers de webhooks para Z-API
  global.wss = wss;
  // Importar a função broadcastToClients para uso global
  import('./services/socket').then(module => {
    global.broadcastToClients = module.broadcastToClients;
    console.log('Função broadcastToClients disponibilizada globalmente');
  }).catch(err => {
    console.error('Erro ao importar función broadcastToClients:', err);
  });

  return httpServer;
}
