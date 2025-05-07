import { type Express, Request, Response } from "express";
import { db } from "@db";
import { channels, insertChannelSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Middleware de autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Schema para validação de dados do canal
const channelCreateSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  type: z.string(),
  isActive: z.boolean().optional(),
  config: z.record(z.any()).optional()
});

// Schema para testar webhook
const testWebhookSchema = z.object({
  phone: z.string(),
  message: z.string(),
  senderName: z.string().optional(),
  eventType: z.string().optional()
});

/**
 * Registra rotas relacionadas a canais
 */
export function registerChannelRoutes(app: Express, apiPrefix: string) {
  
  // Listar todos os canais
  app.get(`${apiPrefix}/channels`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allChannels = await db.query.channels.findMany({
        orderBy: (channels, { desc }) => [desc(channels.createdAt)]
      });
      
      return res.status(200).json(allChannels);
    } catch (error) {
      console.error("Erro ao listar canais:", error);
      return res.status(500).json({ 
        error: "Erro interno ao listar canais" 
      });
    }
  });
  
  // Obter canal por ID
  app.get(`${apiPrefix}/channels/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      return res.status(200).json(channel);
    } catch (error) {
      console.error("Erro ao buscar canal:", error);
      return res.status(500).json({ 
        error: "Erro interno ao buscar canal" 
      });
    }
  });
  
  // Criar novo canal
  app.post(`${apiPrefix}/channels`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validation = channelCreateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: validation.error.format() 
        });
      }
      
      const { name, type, isActive = true, config } = validation.data;
      
      // Converter qualquer objeto complexo para JSON na configuração
      const channelConfig = config ? JSON.stringify(config) : null;
      
      const channelData = {
        name,
        type,
        isActive,
        config: channelConfig
      };
      
      // Validar com schema do Drizzle
      const validatedData = insertChannelSchema.parse(channelData);
      
      const [newChannel] = await db.insert(channels)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newChannel);
    } catch (error) {
      console.error("Erro ao criar canal:", error);
      return res.status(500).json({ 
        error: "Erro interno ao criar canal",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Atualizar canal existente
  app.put(`${apiPrefix}/channels/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      const validation = channelCreateSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: validation.error.format() 
        });
      }
      
      const { name, type, isActive, config } = validation.data;
      
      // Verificar se o canal existe
      const existingChannel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!existingChannel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Converter qualquer objeto complexo para JSON na configuração
      const channelConfig = config ? JSON.stringify(config) : existingChannel.config;
      
      // Atualizar o canal
      const [updatedChannel] = await db.update(channels)
        .set({
          name,
          type,
          isActive,
          config: channelConfig
        })
        .where(eq(channels.id, channelId))
        .returning();
      
      return res.status(200).json(updatedChannel);
    } catch (error) {
      console.error("Erro ao atualizar canal:", error);
      return res.status(500).json({ 
        error: "Erro interno ao atualizar canal" 
      });
    }
  });
  
  // Excluir canal
  app.delete(`${apiPrefix}/channels/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      
      // Verificar se o canal existe
      const existingChannel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!existingChannel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Excluir o canal
      await db.delete(channels)
        .where(eq(channels.id, channelId));
      
      return res.status(200).json({ 
        message: "Canal excluído com sucesso" 
      });
    } catch (error) {
      console.error("Erro ao excluir canal:", error);
      return res.status(500).json({ 
        error: "Erro interno ao excluir canal" 
      });
    }
  });

  // Testar webhook para um canal específico
  app.post(`${apiPrefix}/channels/:id/test-webhook`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      
      // Validar dados do webhook
      const validation = testWebhookSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          success: false,
          message: "Dados inválidos para teste de webhook", 
          errors: validation.error.format() 
        });
      }
      
      const { phone, message, senderName, eventType } = validation.data;
      
      // Verificar se o canal existe
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false,
          message: "Canal não encontrado" 
        });
      }
      
      // Importar serviço de teste de webhook
      const webhookTestService = await import("../services/channels/webhook-test");
      
      // Preparar opções para simulação
      const options = {
        channelId,
        phone: phone || '5511999999999',
        message: message || 'Mensagem de teste via simulação de webhook',
        senderName: senderName || 'Contato Teste',
        eventType: eventType || 'onMessageReceived'
      };
      
      // Simular webhook
      const result = await webhookTestService.simulateWebhookMessage(options);
      
      return res.status(200).json({
        success: result.success,
        message: result.success ? "Webhook testado com sucesso" : "Erro ao testar webhook",
        data: result
      });
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      return res.status(500).json({ 
        success: false,
        message: "Erro interno ao testar webhook",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Atualizar metadados do canal
  app.patch(`${apiPrefix}/channels/:id/metadata`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      const { metadata } = req.body;
      
      if (!metadata || typeof metadata !== 'object') {
        return res.status(400).json({ 
          message: "Metadados inválidos" 
        });
      }
      
      // Verificar se o canal existe
      const existingChannel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!existingChannel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Mesclar os metadados existentes com os novos
      const currentMetadata = existingChannel.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        ...metadata,
        lastUpdated: new Date().toISOString()
      };
      
      // Atualizar apenas os metadados do canal
      const [updatedChannel] = await db.update(channels)
        .set({
          metadata: updatedMetadata
        })
        .where(eq(channels.id, channelId))
        .returning();
      
      return res.status(200).json(updatedChannel);
    } catch (error) {
      console.error("Erro ao atualizar metadados do canal:", error);
      return res.status(500).json({ 
        error: "Erro interno ao atualizar metadados" 
      });
    }
  });
}