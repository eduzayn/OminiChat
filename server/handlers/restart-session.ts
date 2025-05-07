import { Express } from "express";
import { db } from "@db";
import { channels } from "@shared/schema";
import { eq } from "drizzle-orm";
import { restartSession } from "../services/channels/zapi";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

export function registerRestartSessionRoute(app: Express, apiPrefix: string) {
  // Endpoint para reiniciar a sessão do WhatsApp
  app.post(`${apiPrefix}/channels/:id/restart-session`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      console.log(`[RestartSession] Requisição para Canal ID: ${channelId}, Usuário ID: ${userId}`);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        console.log(`[RestartSession] Canal ${channelId} não encontrado`);
        return res.status(404).json({
          success: false,
          message: "Canal não encontrado"
        });
      }
      
      console.log(`[RestartSession] Canal ${channelId} encontrado: ${channel.name}, tipo: ${channel.type}`);
      
      // Verificar se é um canal do tipo WhatsApp
      if (channel.type !== "whatsapp") {
        console.log(`[RestartSession] Canal ${channelId} não é do tipo WhatsApp, é ${channel.type}`);
        return res.status(400).json({
          success: false,
          message: "Apenas canais WhatsApp suportam reinício de sessão"
        });
      }
      
      // Verificar se é um canal da Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        console.log(`[RestartSession] Canal ${channelId} não é da Z-API, é ${channel.config?.provider || 'sem provedor'}`);
        return res.status(400).json({
          success: false,
          message: "Apenas canais Z-API suportam reinício de sessão"
        });
      }
      
      // Reiniciar a sessão
      console.log(`[RestartSession] Reiniciando sessão do canal ${channel.id}`);
      const result = await restartSession(channel);
      
      if (result.status === "success") {
        console.log(`[RestartSession] Sessão reiniciada com sucesso: ${result.message}`);
        return res.json({
          success: true,
          message: result.message || "Sessão reiniciada com sucesso"
        });
      } else {
        console.error(`[RestartSession] Erro ao reiniciar sessão: ${result.message}`);
        return res.status(400).json({
          success: false,
          message: result.message || "Erro ao reiniciar sessão"
        });
      }
    } catch (error) {
      console.error("[RestartSession] Erro ao reiniciar sessão:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao reiniciar sessão",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}