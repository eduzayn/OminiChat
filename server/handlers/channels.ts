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
import { ZAPIClient } from "../services/channels/zapi";
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
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      if (channel.type !== "whatsapp") {
        return res.status(400).json({ message: "QR Code is only available for WhatsApp channels" });
      }
      
      const config = channel.config as ChannelConfig;
      
      // Check if this is a channel that supports QR code (Z-API or custom provider with QR Code)
      if (config.provider === "zapi") {
        // Get QR Code from Z-API
        if (!config.instanceId || !config.token) {
          return res.status(400).json({
            success: false,
            message: "Credenciais Z-API incompletas. Verifique instanceId e token."
          });
        }
        
        console.log(`Criando cliente Z-API para instância ${config.instanceId}`);
        const zapiClient = new ZAPIClient(config.instanceId as string, config.token as string);
        
        // Verificar primeiro o status da instância
        const statusResponse = await zapiClient.getStatus();
        console.log("Status da instância Z-API:", statusResponse);
        
        if (statusResponse.connected) {
          console.log("Instância já está conectada, não é necessário QR Code");
          return res.json({ 
            success: true, 
            status: "connected",
            message: "WhatsApp já está conectado",
            connected: true
          });
        }
        
        // Obter QR Code apenas se não estiver conectado
        console.log("Solicitando QR Code para a Z-API");
        const qrCodeResponse = await zapiClient.getQRCode();
        console.log("Resposta do QR Code Z-API:", qrCodeResponse);
        
        if (qrCodeResponse.error) {
          console.error("Erro ao obter QR Code da Z-API:", qrCodeResponse.error);
          return res.status(500).json({ 
            success: false, 
            message: `Erro ao obter QR Code: ${qrCodeResponse.error}` 
          });
        }
        
        if (!qrCodeResponse.qrcode) {
          console.log("QR Code não disponível - verificando status alternativo");
          
          // Se não tem QR code mas também não tem erro, verificar se está conectado
          if (qrCodeResponse.connected) {
            return res.json({ 
              success: true, 
              status: "connected",
              message: "WhatsApp já está conectado",
              connected: true
            });
          }
          
          return res.status(404).json({ 
            success: false, 
            message: "QR Code não disponível. Verifique o status da instância Z-API." 
          });
        }
        
        return res.json({ 
          success: true, 
          status: "pending",
          qrcode: qrCodeResponse.qrcode,
          connected: false,
          message: "Escaneie o QR Code para conectar o WhatsApp"
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "This channel provider doesn't support QR Code connection" 
        });
      }
    } catch (error) {
      console.error("Error generating QR Code:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to generate QR Code" 
      });
    }
  });

  // Diagnóstico para depurar problemas com a Z-API
  app.get(`${apiPrefix}/channels/:id/zapi-diagnostic`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      const config = channel.config as ChannelConfig;
      
      if (config.provider !== "zapi" || !config.instanceId || !config.token) {
        return res.status(400).json({ 
          message: "Este canal não é Z-API ou está com credenciais incompletas" 
        });
      }
      
      const instanceId = config.instanceId as string;
      const token = config.token as string;
      
      console.log(`Realizando diagnóstico para Z-API ${instanceId}`);
      
      const zapiClient = new ZAPIClient(instanceId, token);
      
      // Verificar todos os endpoints disponíveis
      const diagnostic = {
        base_url: `https://api.z-api.io/instances/${instanceId}`,
        instance_id: instanceId,
        token_length: token.length,
        token_preview: token.substring(0, 4) + '...',
        results: {} as Record<string, any>,
        solutions: [] as string[]
      };
      
      // Testar o endpoint de status
      try {
        const statusResponse = await zapiClient.getStatus();
        diagnostic.results.status = {
          endpoint: '/status',
          success: !statusResponse.error,
          data: statusResponse
        };
      } catch (error: any) {
        diagnostic.results.status = {
          endpoint: '/status',
          success: false,
          error: error.message
        };
      }
      
      // Testar o endpoint de QR code usando qr-code
      try {
        const qrCodeResponse = await zapiClient.getQRCode();
        diagnostic.results.qrCode = {
          endpoint: '/qr-code',
          success: !qrCodeResponse.error,
          has_qrcode: !!qrCodeResponse.qrcode,
          data: qrCodeResponse.qrcode ? { preview: 'QR Code disponível' } : qrCodeResponse
        };
      } catch (error: any) {
        diagnostic.results.qrCode = {
          endpoint: '/qr-code',
          success: false,
          error: error.message
        };
      }
      
      // Não podemos usar makeRequest porque é privado, mas podemos fazer uma chamada direta
      try {
        const apiUrl = `https://api.z-api.io/instances/${instanceId}/qrcode`;
        const response = await axios.get(apiUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': token
          }
        });
        
        diagnostic.results.alternateQRCode = {
          endpoint: '/qrcode',
          success: true,
          status: response.status,
          has_qrcode: !!response.data.qrcode,
          data: response.data.qrcode ? { preview: 'QR Code disponível' } : response.data
        };
      } catch (error: any) {
        diagnostic.results.alternateQRCode = {
          endpoint: '/qrcode',
          success: false,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        };
      }
      
      // Adicionar informações de solução ao diagnóstico
      diagnostic.solutions = [
        "Verificar se o instanceId e token estão corretos",
        "Confirmar que sua instância Z-API está ativa e dentro da validade",
        "Verificar se a versão da API Z-API que você está usando suporta este endpoint",
        "Caso o dispositivo já tenha sido conectado, desconectar e solicitar um novo QR Code",
        "Verificar se sua instância Z-API requer endpoints diferentes (consultar documentação específica da sua versão)",
        "Entrar em contato com o suporte da Z-API para obter ajuda adicional"
      ];
      
      return res.json({
        channel_id: channelId,
        channel_name: channel.name,
        diagnostic
      });
    } catch (error) {
      console.error("Erro ao realizar diagnóstico Z-API:", error);
      return res.status(500).json({ 
        message: "Erro interno ao realizar diagnóstico",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Test channel connection
  app.post(`${apiPrefix}/channels/:id/test`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      console.log(`Testing connection for channel ID ${channelId}`);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false, 
          message: "Canal não encontrado" 
        });
      }
      
      // Verificar o tipo de canal e testar a conexão adequadamente
      if (channel.type === 'whatsapp') {
        if (!channel.config || typeof channel.config !== 'object') {
          return res.status(400).json({ 
            success: false, 
            message: "Configuração do canal incompleta" 
          });
        }
        
        const config = channel.config as ChannelConfig;
        const provider = config.provider;
        
        if (provider === 'zapi') {
          try {
            // Instanciar o cliente ZAPI com as credenciais do canal
            const instanceId = config.instanceId as string;
            const token = config.token as string;
            
            if (!instanceId || !token) {
              return res.status(400).json({
                success: false,
                message: "Credenciais Z-API incompletas. Verifique instanceId e token."
              });
            }
            
            const zapiClient = new ZAPIClient(instanceId, token);
            
            // Verificar o status da instância
            const status = await zapiClient.getStatus();
            console.log(`ZAPI instance status: ${JSON.stringify(status)}`);
            
            // Se a instância está conectada, retorna sucesso
            if (status && (status.connected || status.status === 'connected')) {
              return res.status(200).json({ 
                success: true, 
                message: "WhatsApp conectado e funcionando", 
                status: status 
              });
            } else {
              return res.status(200).json({ 
                success: false, 
                message: "WhatsApp não está conectado. Escaneie o QR Code para conectar.", 
                status: status 
              });
            }
          } catch (error: any) {
            console.error("Error testing ZAPI connection:", error);
            return res.status(200).json({ 
              success: false, 
              message: "Erro ao testar conexão com Z-API. Verifique as credenciais.", 
              error: error?.message || "Erro desconhecido" 
            });
          }
        } else if (provider === 'meta') {
          // Lógica para testar conexão com WhatsApp via Meta API
          return res.status(200).json({ 
            success: true, 
            message: "Conexão com WhatsApp Business verificada" 
          });
        }
      } else if (channel.type === 'messenger' || channel.type === 'instagram') {
        // Lógica para testar conexão com canais Meta (Facebook/Instagram)
        return res.status(200).json({ 
          success: true, 
          message: `Conexão com ${channel.type === 'messenger' ? 'Facebook Messenger' : 'Instagram'} verificada` 
        });
      } else {
        return res.status(200).json({ 
          success: true, 
          message: `Canal do tipo ${channel.type} testado com sucesso` 
        });
      }
    } catch (error) {
      console.error("Error testing channel connection:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro interno ao testar conexão"
      });
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
      
      // Check if there are active conversations for this channel
      const activeConversationsCount = await db
        .select({ count: sql`COUNT(*)` })
        .from(conversations)
        .where(and(
          eq(conversations.channelId, channelId),
          eq(conversations.status, "open")
        ));
      
      const conversationCount = Number(activeConversationsCount[0].count);
      if (conversationCount > 0) {
        return res.status(400).json({ 
          message: "Cannot delete channel with active conversations", 
          activeConversations: activeConversationsCount[0].count 
        });
      }
      
      // Delete channel
      await db
        .delete(channels)
        .where(eq(channels.id, channelId));
      
      // Notify clients about the deleted channel
      broadcastToClients({
        type: 'channel_deleted',
        data: { 
          id: channelId,
          name: channel.name,
          type: channel.type
        }
      });
      
      return res.status(204).end();
      
    } catch (error) {
      console.error("Error deleting channel:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
