import { type Express, Request, Response } from "express";
import { db } from "@db";
import { channels, Channel } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Middleware de autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Schema para validação do teste de mídia
const mediaTestSchema = z.object({
  to: z.string().min(8, "Número de telefone deve ter pelo menos 8 dígitos"),
  content: z.string().optional(),
  mediaUrl: z.string().url("URL de mídia deve ser válida"),
  mediaType: z.enum(["image", "audio", "video", "file"]),
  fileName: z.string().optional()
});

/**
 * Registra rotas de teste para envio de mídias via WhatsApp
 */
export function registerMediaTestRoutes(app: Express, apiPrefix: string) {
  
  // Rota para testar envio de mídia via WhatsApp
  app.post(`${apiPrefix}/channels/:id/media-test`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      
      // Validar dados da requisição
      const validation = mediaTestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          success: false,
          message: "Dados inválidos para teste de mídia", 
          errors: validation.error.format() 
        });
      }
      
      const { to, content, mediaUrl, mediaType, fileName } = validation.data;
      
      // Buscar canal pelo ID
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false,
          message: "Canal não encontrado" 
        });
      }
      
      // Verificar se é um canal do tipo WhatsApp
      if (channel.type !== "whatsapp") {
        return res.status(400).json({ 
          success: false,
          message: "Teste de mídia disponível apenas para canais WhatsApp" 
        });
      }
      
      // Verificar se é um canal Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        return res.status(400).json({ 
          success: false,
          message: "Teste de mídia disponível apenas para canais Z-API" 
        });
      }
      
      console.log(`[MediaTest] Testando envio de ${mediaType} para ${to} via canal ${channelId}`);
      console.log(`[MediaTest] URL: ${mediaUrl}`);
      
      // Importar serviço de WhatsApp para testar envio de mídia
      const whatsAppService = await import("../services/channels/whatsapp");
      
      // Enviar mídia via WhatsApp conforme o tipo
      const result = await whatsAppService.sendWhatsAppMessage(
        channel as Channel,
        to,
        content || `Teste de mídia ${mediaType}`,
        mediaType as any,
        mediaUrl,
        fileName
      );
      
      if (result.status === "success") {
        return res.status(200).json({
          success: true,
          message: `${mediaType} enviado com sucesso`,
          data: result
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Falha ao enviar ${mediaType}: ${result.message}`,
          error: result.message,
          data: result
        });
      }
    } catch (error) {
      console.error("Erro ao testar mídia:", error);
      return res.status(500).json({ 
        success: false,
        message: "Erro interno ao testar mídia",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota específica para teste de vídeo
  app.post(`${apiPrefix}/channels/:id/video-test`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      
      // Obter dados da requisição
      const { to, videoUrl, caption } = req.body;
      
      if (!to || !videoUrl) {
        return res.status(400).json({
          success: false,
          message: "Número e URL do vídeo são obrigatórios"
        });
      }
      
      // Buscar canal pelo ID
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false,
          message: "Canal não encontrado" 
        });
      }
      
      // Verificar se é um canal Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        return res.status(400).json({ 
          success: false,
          message: "Teste de vídeo disponível apenas para canais Z-API" 
        });
      }
      
      console.log(`[VideoTest] Testando envio de vídeo para ${to} via canal ${channelId}`);
      console.log(`[VideoTest] URL: ${videoUrl}, Caption: ${caption || 'sem legenda'}`);
      
      // Importar Z-API diretamente para testar com mais detalhes
      const zapiService = await import("../services/channels/zapi");
      
      // Testar o envio do vídeo diretamente pela função específica
      const result = await zapiService.sendVideoMessage(
        channel,
        to,
        videoUrl,
        caption
      );
      
      return res.status(result.status === "success" ? 200 : 400).json({
        success: result.status === "success",
        message: result.status === "success" 
          ? "Vídeo enviado com sucesso" 
          : `Falha ao enviar vídeo: ${result.message}`,
        data: result
      });
    } catch (error) {
      console.error("Erro ao testar vídeo:", error);
      return res.status(500).json({ 
        success: false,
        message: "Erro interno ao testar vídeo",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}