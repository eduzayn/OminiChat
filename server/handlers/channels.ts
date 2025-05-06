import { Express } from "express";
import { db } from "@db";
import { 
  channels, 
  insertChannelSchema,
  InsertChannel,
  conversations,
  ChannelConfig
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { setupChannel } from "../services/channels/whatsapp";
import { setupInstagramChannel } from "../services/channels/instagram";
import { setupFacebookChannel } from "../services/channels/facebook";
import { broadcastToClients } from "../services/socket";
import axios from "axios";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

// Middleware to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (!req.session || req.session.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
}

export function registerChannelRoutes(app: Express, apiPrefix: string) {
  // Get all channels
  app.get(`${apiPrefix}/channels`, isAuthenticated, async (req, res) => {
    try {
      const allChannels = await db.query.channels.findMany();
      
      return res.json(allChannels);
      
    } catch (error) {
      console.error("Error fetching channels:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get channel by ID
  app.get(`${apiPrefix}/channels/:id`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      return res.json(channel);
      
    } catch (error) {
      console.error("Error fetching channel:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create a new channel
  app.post(`${apiPrefix}/channels`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Validate request body
      const validation = insertChannelSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid channel data", 
          errors: validation.error.errors 
        });
      }
      
      // Prepare channel data
      const channelData = {
        name: req.body.name,
        type: req.body.type,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        config: req.body.config || {}
      };
      
      // Insert channel
      const [newChannel] = await db
        .insert(channels)
        .values(channelData)
        .returning();
      
      // Setup channel based on type
      let setupResult = null;
      
      switch (newChannel.type) {
        case "whatsapp":
          setupResult = await setupChannel(newChannel);
          break;
        case "instagram":
          setupResult = await setupInstagramChannel(newChannel);
          break;
        case "facebook":
          setupResult = await setupFacebookChannel(newChannel);
          break;
        default:
          break;
      }
      
      if (setupResult && setupResult.status === "error") {
        // If setup failed, update the channel with error info
        const updatedConfig = {
          ...(newChannel.config as Record<string, any>),
          setupError: setupResult.message
        };
        
        await db
          .update(channels)
          .set({ 
            isActive: false,
            config: updatedConfig
          })
          .where(eq(channels.id, newChannel.id));
          
        const responseChannel = {
          ...newChannel,
          isActive: false,
          config: updatedConfig,
          setupError: setupResult.message
        };
        
        // Notify clients about new channel (even with error)
        broadcastToClients({
          type: 'channel_created',
          data: responseChannel
        });
        
        return res.status(201).json(responseChannel);
      }
      
      // Notify clients about new channel
      broadcastToClients({
        type: 'channel_created',
        data: newChannel
      });
      
      return res.status(201).json(newChannel);
      
    } catch (error) {
      console.error("Error creating channel:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update a channel
  app.patch(`${apiPrefix}/channels/:id`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      // Prepare update data
      const updateData: any = {};
      
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      if (req.body.config !== undefined) updateData.config = req.body.config;
      
      // Update channel
      const [updatedChannel] = await db
        .update(channels)
        .set({ 
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(channels.id, channelId))
        .returning();
      
      // If channel was activated, try to setup
      if (req.body.isActive === true && !channel.isActive) {
        let setupResult = null;
        
        switch (updatedChannel.type) {
          case "whatsapp":
            setupResult = await setupChannel(updatedChannel);
            break;
          case "instagram":
            setupResult = await setupInstagramChannel(updatedChannel);
            break;
          case "facebook":
            setupResult = await setupFacebookChannel(updatedChannel);
            break;
          default:
            break;
        }
        
        if (setupResult && setupResult.status === "error") {
          // If setup failed, update the channel with error info
          const updatedConfig = {
            ...(updatedChannel.config as Record<string, any>),
            setupError: setupResult.message
          };
          
          const [finalChannel] = await db
            .update(channels)
            .set({ 
              isActive: false,
              config: updatedConfig
            })
            .where(eq(channels.id, channelId))
            .returning();
            
          const responseChannel = {
            ...finalChannel,
            setupError: setupResult.message
          };
          
          // Notify clients about the updated channel
          broadcastToClients({
            type: 'channel_updated',
            data: responseChannel
          });
          
          return res.json(responseChannel);
        }
      }
      
      // Notify clients about the updated channel
      broadcastToClients({
        type: 'channel_updated',
        data: updatedChannel
      });
      
      return res.json(updatedChannel);
      
    } catch (error) {
      console.error("Error updating channel:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get QR Code for WhatsApp channel
  app.get(`${apiPrefix}/channels/:id/qrcode`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      console.log(`[QRCode Handler] Requisição para Canal ID: ${channelId}, Usuário ID: ${userId}`);
      
      if (isNaN(channelId)) {
        console.error(`[QRCode Handler] ID de canal inválido: ${req.params.id}`);
        return res.status(400).json({ 
          success: false, 
          message: "ID de canal inválido"
        });
      }
      
      // Buscar o canal com verificação detalhada
      console.log(`[QRCode Handler] Buscando canal ${channelId} no banco de dados`);
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        console.error(`[QRCode Handler] Canal ${channelId} não encontrado no banco de dados`);
        return res.status(404).json({ 
          success: false, 
          message: "Canal não encontrado", 
          details: `O canal com ID ${channelId} não existe no banco de dados.`,
          technical_details: `DB query: channels.findFirst({where: eq(channels.id, ${channelId})})`
        });
      }
      
      console.log(`[QRCode Handler] Canal ${channelId} encontrado: ${channel.name}, tipo: ${channel.type}`);
      
      if (channel.type !== "whatsapp") {
        console.error(`[QRCode Handler] Tipo de canal incompatível: ${channel.type}`);
        return res.status(400).json({ 
          success: false, 
          message: "QR Code só está disponível para canais WhatsApp",
          details: `O canal selecionado é do tipo ${channel.type}`
        });
      }
      
      const config = channel.config as ChannelConfig;
      
      if (!config || !config.provider) {
        console.error(`[QRCode Handler] Configuração de canal incompleta: ${JSON.stringify(config)}`);
        return res.status(400).json({
          success: false,
          message: "Configuração de canal incompleta",
          details: "O canal não possui uma configuração de provedor válida"
        });
      }
      
      console.log(`[QRCode Handler] Provedor do canal: ${config.provider}`);
      
      // Verificar se é um canal Z-API
      if (config.provider === "zapi") {
        console.log("[QRCode Handler] Solicitando QR Code da Z-API");
        
        try {
          // Importar o módulo de serviço Z-API
          const zapiService = await import("../services/channels/zapi");
          
          // Verificar status da conexão Z-API
          const statusResult = await zapiService.checkConnectionStatus(channel);
          
          if (statusResult.connected) {
            console.log("[QRCode Handler] Canal Z-API já está conectado");
            return res.json({
              success: true,
              status: "connected",
              connected: true,
              message: "WhatsApp já está conectado"
            });
          }
          
          // Gerar QR Code
          const setupResult = await zapiService.setupZAPIChannel(channel);
          
          if (setupResult.status === "pending" && setupResult.qrCode) {
            console.log("[QRCode Handler] QR Code obtido da Z-API com sucesso");
            return res.json({
              success: true,
              status: "waiting_scan",
              qrcode: setupResult.qrCode,
              connected: false
            });
          } else if (setupResult.status === "success") {
            console.log("[QRCode Handler] Canal Z-API conectado com sucesso");
            return res.json({
              success: true,
              status: "connected",
              connected: true,
              message: setupResult.message
            });
          } else {
            console.error(`[QRCode Handler] Erro ao obter QR Code da Z-API: ${setupResult.message}`);
            return res.status(500).json({
              success: false,
              message: setupResult.message || "Erro ao obter QR Code da Z-API",
              details: "O serviço Z-API não retornou um QR Code válido"
            });
          }
        } catch (error) {
          console.error("[QRCode Handler] Erro ao processar requisição Z-API:", error);
          return res.status(500).json({
            success: false,
            message: "Erro ao processar requisição Z-API",
            details: error instanceof Error ? error.message : "Erro desconhecido"
          });
        }
      }
      
      // Check provider type for QR code
      if (config.provider === "api" && config.apiUrl) {
        try {
          console.log(`[QRCode Handler] Solicitando QR Code da API externa: ${config.apiUrl}`);
          
          const apiResult = await axios.get(`${config.apiUrl}/qrcode`, {
            headers: {
              "Authorization": `Bearer ${config.apiKey || ''}`,
              "Content-Type": "application/json"
            }
          });
          
          if (apiResult.data?.qrcode || apiResult.data?.image) {
            console.log(`[QRCode Handler] QR Code obtido da API externa com sucesso`);
            return res.json({ 
              success: true, 
              status: "waiting_scan",
              qrcode: apiResult.data.qrcode,
              image: apiResult.data.image,
              connected: false
            });
          } else {
            console.error(`[QRCode Handler] API externa não retornou um QR Code válido`);
            return res.status(500).json({ 
              success: false, 
              message: "API externa não retornou um QR Code válido",
              details: apiResult.data?.message || "A API não forneceu informações adicionais"
            });
          }
        } catch (error) {
          console.error(`[QRCode Handler] Erro ao solicitar QR Code da API externa:`, error);
          return res.status(500).json({ 
            success: false, 
            message: "Erro ao solicitar QR Code da API externa",
            details: error.response?.data?.message || error.message || "Erro de conexão"
          });
        }
      }
      
      // Default response for unsupported providers
      console.error(`[QRCode Handler] Provedor não suporta QR Code: ${config.provider}`);
      return res.status(400).json({ 
        success: false, 
        message: "Este provedor não suporta geração de QR Code",
        details: `O provedor ${config.provider} não tem implementação para geração de QR Code.`
      });
    } catch (error) {
      console.error("Error getting QR code:", error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        details: error.message 
      });
    }
  });
  
  // Test channel connection
  app.post(`${apiPrefix}/channels/:id/test-connection`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      const config = channel.config as any;
      const provider = config.provider;
      
      if (!provider) {
        return res.status(400).json({ 
          success: false,
          message: "Canal sem provedor configurado" 
        });
      }
      
      // Implementar testes de conexão de acordo com o provedor
      if (provider === 'api') {
        try {
          const apiUrl = config.apiUrl;
          const apiKey = config.apiKey;
          
          if (!apiUrl) {
            return res.status(400).json({ 
              success: false,
              message: "URL da API não configurada" 
            });
          }
          
          // Fazer uma chamada básica para a API para testar a conexão
          const response = await axios.get(`${apiUrl}/status`, {
            headers: {
              "Authorization": `Bearer ${apiKey || ''}`,
              "Content-Type": "application/json"
            }
          });
          
          if (response.status >= 200 && response.status < 300) {
            return res.json({
              success: true,
              message: "Conexão estabelecida com sucesso",
              details: response.data
            });
          } else {
            return res.status(response.status).json({
              success: false,
              message: "Erro ao conectar com a API",
              details: response.data
            });
          }
        } catch (error: any) {
          console.error("Error testing API connection:", error);
          return res.status(500).json({ 
            success: false,
            message: "Erro ao testar conexão com API", 
            details: error.response?.data || error.message || 'Erro desconhecido'
          });
        }
      } 
      
      // Teste de conexão para Z-API
      if (provider === 'zapi') {
        try {
          // Importar o módulo de serviço Z-API
          const zapiService = await import("../services/channels/zapi");
          
          // Verificar status da conexão
          const statusResult = await zapiService.checkConnectionStatus(channel);
          
          if (statusResult.connected) {
            return res.json({
              success: true,
              message: "WhatsApp conectado via Z-API",
              details: statusResult.message || "Conexão estabelecida com sucesso"
            });
          } else {
            return res.status(400).json({
              success: false,
              message: "WhatsApp não está conectado via Z-API",
              details: statusResult.message || "Escaneie o QR Code para conectar"
            });
          }
        } catch (error) {
          console.error("Erro ao testar conexão Z-API:", error);
          return res.status(500).json({
            success: false,
            message: "Erro ao testar conexão Z-API",
            details: error instanceof Error ? error.message : "Erro desconhecido"
          });
        }
      }
      
      // Se chegou aqui, o provedor não tem implementação de teste
      return res.status(400).json({
        success: false,
        message: `Teste de conexão não implementado para o provedor ${provider}`
      });
      
    } catch (error) {
      console.error("Error testing connection:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete a channel
  app.delete(`${apiPrefix}/channels/:id`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      // Check if channel has conversations
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.channelId, channelId)
      });
      
      if (conversation) {
        return res.status(400).json({ 
          message: "Cannot delete channel with existing conversations",
          details: "You must delete all conversations associated with this channel first."
        });
      }
      
      // Delete channel
      await db
        .delete(channels)
        .where(eq(channels.id, channelId));
      
      // Notify clients about the deleted channel
      broadcastToClients({
        type: 'channel_deleted',
        data: { id: channelId }
      });
      
      return res.json({ 
        success: true,
        message: "Channel deleted successfully" 
      });
      
    } catch (error) {
      console.error("Error deleting channel:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get channel statistics
  app.get(`${apiPrefix}/channels/:id/stats`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      // Count conversations for this channel
      const conversationCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(eq(conversations.channelId, channelId));
      
      // Get active conversations count
      const activeConversations = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            eq(conversations.channelId, channelId),
            eq(conversations.status, 'active')
          )
        );
      
      // Get completed conversations count
      const completedConversations = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(
          and(
            eq(conversations.channelId, channelId),
            eq(conversations.status, 'closed')
          )
        );
      
      return res.json({
        total_conversations: conversationCount[0]?.count || 0,
        active_conversations: activeConversations[0]?.count || 0,
        completed_conversations: completedConversations[0]?.count || 0
      });
      
    } catch (error) {
      console.error("Error getting channel stats:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}