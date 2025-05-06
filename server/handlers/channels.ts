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
import { 
  setupZAPIChannel, 
  getQRCodeForChannel, 
  testZapiInstances 
} from "../services/channels/zapi";

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
  // Testar conexão com instâncias Z-API
  app.get(`${apiPrefix}/test-zapi-instances`, isAuthenticated, async (req, res) => {
    try {
      console.log(`Iniciando teste de instâncias Z-API...`);
      const result = await testZapiInstances();
      console.log(`Resultado do teste de instâncias Z-API:`, result);
      return res.json(result);
    } catch (error) {
      console.error("Erro ao testar instâncias Z-API:", error);
      return res.status(500).json({ 
        message: "Erro ao testar instâncias Z-API", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });
  
  // Endpoint de teste direto para obter QR code Z-API sem autenticação
  app.get(`${apiPrefix}/test-zapi-qrcode`, async (req, res) => {
    try {
      console.log("Solicitando diretamente QR code da Z-API para teste...");
      
      // Importar funções necessárias
      const zapiService = await import("../services/channels/zapi");
      
      // Buscar o canal 23 que já sabemos que existe
      const channel23 = await db.query.channels.findFirst({
        where: eq(channels.id, 23)
      });
      
      if (!channel23) {
        return res.status(404).json({
          success: false,
          message: "Canal de teste não encontrado (ID 23)"
        });
      }
      
      // Tentar obter QR code
      const qrCodeResult = await zapiService.getQRCodeForChannel(channel23);
      
      // Log completo da resposta
      console.log("Resposta do getQRCodeForChannel:", JSON.stringify(qrCodeResult));
      
      // Se foi obtido um QR code
      if (qrCodeResult.status === "waiting_scan" && qrCodeResult.qrCode) {
        return res.json({
          success: true,
          status: "waiting_scan",
          message: qrCodeResult.message,
          qrcode: qrCodeResult.qrCode
        });
      } else {
        return res.status(500).json({
          success: false,
          status: qrCodeResult.status,
          message: qrCodeResult.message || "Falha ao obter QR code"
        });
      }
    } catch (error) {
      console.error("Erro ao obter QR code de teste:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao obter QR code de teste",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Novo endpoint com HTML minimalista para visualizar QR Code diretamente
  app.get('/api/test-zapi-qrcode-view', async (req, res) => {
    try {
      console.log("Gerando página HTML para visualização de QR code...");
      
      // Importar funções necessárias
      const zapiService = await import("../services/channels/zapi");
      
      // Buscar o canal 23 que já sabemos que existe
      const channel23 = await db.query.channels.findFirst({
        where: eq(channels.id, 23)
      });
      
      if (!channel23) {
        return res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
              <h1>Erro: Canal não encontrado</h1>
              <p>O canal com ID 23 não foi encontrado no banco de dados.</p>
            </body>
          </html>
        `);
      }
      
      // Tentar obter QR code
      console.log("Obtendo QR code para canal ID 23:", channel23.name);
      const qrCodeResult = await zapiService.getQRCodeForChannel(channel23);
      
      // Log completo da resposta
      console.log("Resposta do getQRCodeForChannel:", 
        qrCodeResult.status, 
        qrCodeResult.message, 
        qrCodeResult.qrCode ? "QR Code obtido (não exibido no log)" : "Sem QR Code"
      );
      
      if (qrCodeResult.qrCode) {
        // Verificar se o QR code parece ser válido (começa com data:image)
        const isValidQrCode = qrCodeResult.qrCode.startsWith('data:image');
        const qrCodeLength = qrCodeResult.qrCode.length;
        console.log(`Diagnóstico do QR Code: Válido=${isValidQrCode}, Tamanho=${qrCodeLength}, Primeiros 50 caracteres: ${qrCodeResult.qrCode.substring(0, 50)}...`);
      }
      
      // Se foi obtido um QR code
      if (qrCodeResult.status === "waiting_scan" && qrCodeResult.qrCode) {
        return res.send(`
          <html>
            <head>
              <title>QR Code para conexão WhatsApp</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  margin-top: 50px; 
                  background-color: #f5f5f5;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: white;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .qr-code {
                  margin: 20px auto;
                  padding: 20px;
                  background-color: white;
                  display: inline-block;
                  border-radius: 10px;
                }
                h1 { color: #075E54; }
                p { margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>QR Code para conexão WhatsApp</h1>
                <p>Escaneie o QR code abaixo com o WhatsApp para conectar:</p>
                <div class="qr-code">
                  <img src="${qrCodeResult.qrCode}" alt="QR Code" style="max-width: 300px;" />
                </div>
                <p>Canal: ${channel23.name} (ID: ${channel23.id})</p>
                <p><small>Atualize a página se o QR code expirar.</small></p>
              </div>
            </body>
          </html>
        `);
      } else {
        return res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
              <h1>Erro ao obter QR Code</h1>
              <p>${qrCodeResult.message || "Falha ao obter QR code"}</p>
              <p>Status: ${qrCodeResult.status}</p>
              <p><a href="javascript:location.reload()">Tentar novamente</a></p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Erro ao obter QR code de teste:", error);
      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1>Erro interno</h1>
            <p>Ocorreu um erro ao processar a requisição</p>
            <p>${error instanceof Error ? error.message : "Erro desconhecido"}</p>
            <p><a href="javascript:location.reload()">Tentar novamente</a></p>
          </body>
        </html>
      `);
    }
  });
  
  // Endpoint de diagnóstico da integração Z-API (público, para debug)
  app.get(`${apiPrefix}/zapi-diagnostic`, async (req, res) => {
    try {
      console.log("Iniciando diagnóstico Z-API...");
      
      // 1. Verificar canais disponíveis
      const availableChannels = await db.query.channels.findMany();
      const zapiChannels = availableChannels.filter(c => 
        c.type === "whatsapp" && 
        (c.config as any)?.provider === "zapi"
      );
      
      // 2. Verificar canal 23 especificamente
      const channel23 = await db.query.channels.findFirst({
        where: eq(channels.id, 23)
      });
      
      // 3. Verificar variáveis de ambiente
      const envVars = {
        ZAPI_TOKEN: process.env.ZAPI_TOKEN ? "Definido" : "Não definido",
        ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID ? "Definido" : "Não definido", 
        CLIENT_TOKEN_ZAPI: process.env.CLIENT_TOKEN_ZAPI ? "Definido" : "Não definido",
        ZAPI_CLIENT_TOKEN: process.env.ZAPI_CLIENT_TOKEN ? "Definido" : "Não definido"
      };
      
      // 4. Testar conexão com Z-API
      let zapiTest;
      try {
        zapiTest = await testZapiInstances();
      } catch (error) {
        zapiTest = { error: error instanceof Error ? error.message : "Erro desconhecido" };
      }
      
      // Resposta com diagnóstico completo
      return res.json({
        totalChannels: availableChannels.length,
        zapiChannelsCount: zapiChannels.length,
        zapiChannels: zapiChannels.map(c => ({
          id: c.id,
          name: c.name,
          active: c.isActive,
          config: c.config
        })),
        channel23: channel23 ? {
          exists: true,
          id: channel23.id,
          name: channel23.name,
          type: channel23.type,
          active: channel23.isActive,
          config: channel23.config
        } : { exists: false },
        environmentVariables: envVars,
        zapiConnectionTest: zapiTest
      });
    } catch (error) {
      console.error("Erro ao realizar diagnóstico Z-API:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao realizar diagnóstico",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
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
      console.log("Corpo da requisição:", JSON.stringify(req.body));
      const validation = insertChannelSchema.safeParse(req.body);
      
      if (!validation.success) {
        console.log("Erro de validação:", JSON.stringify(validation.error.errors));
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
  app.get(`${apiPrefix}/channels/:id/qr-code`, isAuthenticated, async (req, res) => {
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
      let channel = await db.query.channels.findFirst({
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
      console.log(`[QRCode Handler] Detalhes do canal: `, {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        providerId: config.provider,
        // Ocultar partes sensíveis e mostrar apenas para debug
        instanceId: config.instanceId ? `${config.instanceId.substring(0, 4)}...` : undefined,
        hasToken: !!config.token
      });
      
      // Verificar se é um canal Z-API
      if (config.provider === "zapi") {
        console.log("[QRCode Handler] Solicitando QR Code da Z-API");
        
        try {
          // Importar o módulo de serviço Z-API
          const zapiService = await import("../services/channels/zapi");
          
          // Verificar e atualizar as credenciais se necessário
          if (!config.instanceId || !config.token) {
            console.log("[QRCode Handler] Credenciais incompletas, usando variáveis de ambiente");
            
            // Usar variáveis de ambiente se não houver configuração específica
            const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
            const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
            
            if (ZAPI_INSTANCE_ID && ZAPI_TOKEN) {
              // Atualizar o canal com as credenciais do ambiente
              await db.update(channels)
                .set({
                  config: {
                    ...config,
                    instanceId: ZAPI_INSTANCE_ID,
                    token: ZAPI_TOKEN
                  }
                })
                .where(eq(channels.id, channel.id));
                
              // Recarregar o canal com as novas credenciais
              const updatedChannel = await db.query.channels.findFirst({
                where: eq(channels.id, channel.id)
              });
              
              if (updatedChannel) {
                channel = updatedChannel;
              }
            }
          }
          
          // Usar a função específica para obter QR Code
          const qrResult = await zapiService.getQRCodeForChannel(channel);
          
          if (qrResult.status === "connected") {
            console.log("[QRCode Handler] Canal Z-API já está conectado");
            return res.json({
              success: true,
              status: "connected",
              connected: true,
              message: qrResult.message || "WhatsApp já está conectado"
            });
          } else if (qrResult.status === "waiting_scan" && qrResult.qrCode) {
            console.log("[QRCode Handler] QR Code obtido da Z-API com sucesso");
            return res.json({
              success: true,
              status: "waiting_scan",
              qrcode: qrResult.qrCode,
              connected: false
            });
          } else {
            console.error(`[QRCode Handler] Erro ao obter QR Code da Z-API: ${qrResult.message}`);
            return res.status(500).json({
              success: false,
              message: qrResult.message || "Erro ao obter QR Code da Z-API",
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
    } catch (error: any) {
      console.error("Error getting QR code:", error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error", 
        details: error.message || "Unknown error" 
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
  app.delete(`${apiPrefix}/channels/:id`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
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
      const isZapiChannel = channel.type === "whatsapp" && 
                           channel.config && 
                           (channel.config as any).provider === "zapi";
      
      // Para canais que não são Z-API, verificar se têm conversas associadas
      if (!isZapiChannel) {
        // Verificar se tem permissão de admin para canais não Z-API
        if (req.session.userRole !== "admin") {
          return res.status(403).json({ 
            success: false,
            message: "Permissão negada. Apenas administradores podem excluir canais não Z-API." 
          });
        }
        
        // Check if channel has conversations
        const conversation = await db.query.conversations.findFirst({
          where: eq(conversations.channelId, channelId)
        });
        
        if (conversation) {
          return res.status(400).json({ 
            success: false,
            message: "Não é possível excluir canal com conversas existentes",
            details: "Você deve excluir todas as conversas associadas a este canal primeiro."
          });
        }
      } else {
        // Para canais Z-API, tenta desconectar a sessão antes de excluir
        try {
          console.log("Desconectando sessão Z-API antes de excluir canal:", channelId);
          const zapiService = await import("../services/channels/zapi");
          await zapiService.disconnectSession(channel);
        } catch (error) {
          console.error("Erro ao desconectar sessão Z-API:", error);
          // Continuar com a exclusão mesmo se a desconexão falhar
        }
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
        message: "Canal excluído com sucesso" 
      });
      
    } catch (error) {
      console.error("Erro ao excluir canal:", error);
      return res.status(500).json({ 
        success: false,
        message: "Erro ao excluir canal",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
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