/**
 * webhook-simulation.ts
 * Manipuladores para simular webhooks para testes
 */

import { type Express, Request, Response } from "express";
import { db } from "@db";
import { channels } from "@shared/schema";
import { eq } from "drizzle-orm";

// Middleware de autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

/**
 * Registra a rota de simulação de webhook
 */
export function registerWebhookSimulationRoutes(app: Express, apiPrefix: string) {
  
  // Simular recebimento de webhook (para testes)
  app.post(`${apiPrefix}/channels/:id/simulate-webhook`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      const { phone, message, senderName, eventType } = req.body;
      
      // Buscar canal
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false, 
          message: "Canal não encontrado" 
        });
      }
      
      if (channel.type !== 'whatsapp') {
        return res.status(400).json({ 
          success: false, 
          message: "Simulação de webhook disponível apenas para canais WhatsApp" 
        });
      }
      
      // Importar serviço de teste de webhook
      const webhookTestService = await import("../services/channels/webhook-test");
      
      // Preparar opções para simulação
      const options = {
        channelId,
        phone: phone || '5511999999999',
        message: message || 'Mensagem de teste via simulação de webhook',
        senderName: senderName || 'Contato Teste Simulado',
        eventType: eventType || 'onMessageReceived'
      };
      
      // Simular webhook
      const result = await webhookTestService.simulateWebhookMessage(options);
      
      return res.status(200).json({
        success: result.success,
        message: result.success ? "Webhook simulado com sucesso" : "Erro ao simular webhook",
        result
      });
    } catch (error) {
      console.error("Erro ao simular webhook:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro interno ao simular webhook",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}