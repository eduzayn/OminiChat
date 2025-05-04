import { Express, Request, Response } from "express";
import { generateAIResponse, analyzeSentiment, generateQuickResponse, shouldAutoReply } from "../services/ai";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { messages } from "@shared/schema";

// Middleware para verificar autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

/**
 * Registra as rotas de IA para a aplicação
 * @param app Express app
 * @param apiPrefix Prefixo da API
 */
export function registerAIRoutes(app: Express, apiPrefix: string) {

  // Rota para configurações da IA
  app.post(`${apiPrefix}/ai/settings`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      
      // Aqui poderíamos salvar as configurações no banco de dados
      // Por enquanto apenas retornamos sucesso
      
      return res.status(200).json({ 
        message: "Configurações salvas com sucesso",
        settings 
      });
      
    } catch (error) {
      console.error("Erro ao salvar configurações de IA:", error);
      return res.status(500).json({
        message: "Erro ao salvar configurações de IA",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Teste de resposta automática
  app.post(`${apiPrefix}/ai/auto-reply-test`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }
      
      const result = await shouldAutoReply(message);
      return res.status(200).json(result);
      
    } catch (error) {
      console.error("Erro ao testar resposta automática:", error);
      return res.status(500).json({
        message: "Erro ao processar teste de resposta automática",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Gerar resposta de IA para uma pergunta específica
  app.post(`${apiPrefix}/ai/generate-response`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { prompt, conversationId, messageIds } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt é obrigatório" });
      }
      
      // Se tiver um conversationId, buscar as mensagens da conversa para contexto
      let conversationHistory = "";
      if (conversationId && messageIds && messageIds.length > 0) {
        const conversationMessages = await db.query.messages.findMany({
          where: eq(messages.conversationId, conversationId),
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          limit: 20
        });
        
        if (conversationMessages.length > 0) {
          conversationHistory = conversationMessages
            .map(msg => `${msg.isFromAgent ? "Atendente" : "Cliente"}: ${msg.content}`)
            .join("\n");
        }
      }
      
      const response = await generateAIResponse(prompt, conversationHistory);
      return res.status(200).json({ response });
      
    } catch (error) {
      console.error("Erro ao gerar resposta de IA:", error);
      return res.status(500).json({ 
        message: "Erro ao processar solicitação de IA",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Análise de sentimento de texto
  app.post(`${apiPrefix}/ai/analyze-sentiment`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }
      
      const result = await analyzeSentiment(text);
      return res.status(200).json(result);
      
    } catch (error) {
      console.error("Erro ao analisar sentimento:", error);
      return res.status(500).json({ 
        message: "Erro ao processar análise de sentimento",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Gerar resposta rápida baseada em tipo
  app.post(`${apiPrefix}/ai/quick-response`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type, messageContent, conversationId } = req.body;
      
      if (!type || !messageContent) {
        return res.status(400).json({ 
          message: "Tipo de resposta e conteúdo da mensagem são obrigatórios" 
        });
      }
      
      // Obter histórico da conversa se fornecido conversationId
      let conversationHistory = "";
      if (conversationId) {
        const conversationMessages = await db.query.messages.findMany({
          where: eq(messages.conversationId, conversationId),
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          limit: 20
        });
        
        if (conversationMessages.length > 0) {
          conversationHistory = conversationMessages
            .map(msg => `${msg.isFromAgent ? "Atendente" : "Cliente"}: ${msg.content}`)
            .join("\n");
        }
      }
      
      const response = await generateQuickResponse(
        type as "concise" | "summary" | "correction",
        messageContent,
        conversationHistory
      );
      
      return res.status(200).json({ response });
      
    } catch (error) {
      console.error("Erro ao gerar resposta rápida:", error);
      return res.status(500).json({ 
        message: "Erro ao processar solicitação de resposta rápida",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}