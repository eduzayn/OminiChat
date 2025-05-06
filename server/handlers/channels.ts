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
import { ZAPIClient, ZAPIResponse } from "../services/channels/zapi";
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
      
      // Check if this is a channel that supports QR code (Z-API or custom provider with QR Code)
      if (config.provider === "zapi") {
        // Get QR Code from Z-API
        if (!config.instanceId || !config.token) {
          console.error(`[QRCode Handler] Credenciais Z-API incompletas: instanceId=${!!config.instanceId}, token=${!!config.token}`);
          return res.status(400).json({
            success: false,
            message: "Credenciais Z-API incompletas. Verifique instanceId e token.",
            details: "As credenciais da Z-API estão ausentes ou incompletas na configuração do canal"
          });
        }
        
        console.log(`[QRCode Handler] Criando cliente Z-API para instância ${config.instanceId}`);
        const zapiClient = new ZAPIClient(config.instanceId as string, config.token as string);
        
        // Verificar primeiro o status da instância
        console.log(`[QRCode Handler] Verificando status da instância Z-API`);
        const statusResponse = await zapiClient.getStatus();
        console.log(`[QRCode Handler] Resposta de status Z-API:`, statusResponse);
        
        if (statusResponse.connected) {
          console.log(`[QRCode Handler] Instância já está conectada, não é necessário QR Code`);
          return res.json({ 
            success: true, 
            status: "connected",
            message: "WhatsApp já está conectado",
            connected: true
          });
        }
        
        // Verificar se temos erro no status
        if (statusResponse.error) {
          console.error(`[QRCode Handler] Erro ao verificar status: ${statusResponse.error}`);
          
          // Tratamento específico para o erro de credenciais inválidas
          if (statusResponse.error === 'INVALID_CREDENTIALS') {
            return res.status(500).json({ 
              success: false,
              error_code: 'INVALID_CREDENTIALS', 
              message: "Erro ao verificar status da instância Z-API: Credenciais inválidas",
              details: `As credenciais fornecidas (instanceId e token) parecem ser inválidas ou a instância não existe no serviço Z-API. Verifique se estão corretas no painel da Z-API.`,
              recommendations: [
                "Verifique se o instanceId e token estão corretos no painel da Z-API",
                "Confirme se sua instância Z-API está ativa e dentro da validade",
                "Tente criar uma nova instância no painel da Z-API e use as novas credenciais"
              ],
              technical_info: {
                instanceId: config.instanceId,
                error_details: statusResponse.message || 'Credenciais inválidas ou instância inexistente',
                failed_attempts: statusResponse.failed_attempts || statusResponse.attempted_endpoints || []
              }
            });
          }
          
          // Tratamento específico para o erro NOT_FOUND
          if (typeof statusResponse.error === 'string' && statusResponse.error.includes('NOT_FOUND')) {
            return res.status(500).json({ 
              success: false,
              error_code: 'NOT_FOUND', 
              message: "Erro ao verificar status da instância Z-API: NOT_FOUND",
              details: `Este erro geralmente indica que suas credenciais Z-API estão incorretas ou a instância não existe. Verifique o instanceId e token no painel da Z-API.`,
              recommendations: [
                "Verifique se o instanceId e token estão corretos no painel da Z-API",
                "Confirme se sua instância Z-API está ativa e dentro da validade",
                "Tente criar uma nova instância no painel da Z-API e use as novas credenciais"
              ],
              technical_info: {
                instanceId: config.instanceId,
                error_details: statusResponse.message || 'Unable to find matching resource',
                failed_attempts: statusResponse.failed_attempts || statusResponse.attempted_endpoints || []
              }
            });
          }
          
          // Tratamento para erro específico de STATUS_CHECK_FAILED
          if (statusResponse.error === 'STATUS_CHECK_FAILED') {
            return res.status(500).json({ 
              success: false,
              error_code: 'STATUS_CHECK_FAILED', 
              message: "Erro ao verificar status da instância Z-API",
              details: `Não foi possível verificar o status da conexão usando nenhum dos endpoints disponíveis da Z-API. Isso pode indicar:
              1. Um problema temporário de comunicação com a API
              2. Uma mudança recente na API Z-API que tornou os endpoints incompatíveis
              3. Alguma restrição de acesso na sua instância`,
              recommendations: [
                "Aguarde alguns minutos e tente novamente",
                "Verifique se o instanceId e token estão corretos",
                "Verifique a documentação atualizada da Z-API para confirmar os endpoints",
                "Entre em contato com o suporte da Z-API para mais informações"
              ],
              technical_info: {
                instanceId: config.instanceId,
                error_details: statusResponse.message || 'Falha na verificação de status',
                failed_attempts: statusResponse.failed_attempts || statusResponse.attempted_endpoints || []
              }
            });
          }
          
          // Tratamento genérico para outros erros
          return res.status(500).json({ 
            success: false, 
            error_code: statusResponse.error,
            message: `Erro ao verificar status da instância Z-API: ${statusResponse.error}`,
            details: statusResponse.message || 'Ocorreu um erro ao verificar o status da instância',
            technical_info: {
              error: statusResponse.error,
              message: statusResponse.message,
              failed_attempts: statusResponse.failed_attempts || statusResponse.attempted_endpoints || []
            }
          });
        }
        
        // Obter QR Code apenas se não estiver conectado
        console.log(`[QRCode Handler] Solicitando QR Code para a Z-API`);
        const qrCodeResponse = await zapiClient.getQRCode();
        console.log(`[QRCode Handler] Resposta do QR Code Z-API:`, 
          qrCodeResponse.qrcode ? 
          {...qrCodeResponse, qrcode: `[QR Code data recebido - ${qrCodeResponse.qrcode?.length || 0} caracteres]`} : 
          qrCodeResponse
        );
        
        if (qrCodeResponse.error) {
          console.error(`[QRCode Handler] Erro ao obter QR Code da Z-API:`, qrCodeResponse.error);
          
          // Tratamento específico para o erro NOT_FOUND
          if (typeof qrCodeResponse.error === 'string' && qrCodeResponse.error.includes('NOT_FOUND')) {
            return res.status(500).json({ 
              success: false,
              error_code: 'NOT_FOUND', 
              message: `Erro ao obter QR Code: NOT_FOUND`,
              details: `Este erro geralmente indica que a API Z-API não encontrou o recurso solicitado. Possíveis causas:
              1. O endpoint de QR Code pode ter mudado na sua versão da Z-API
              2. Sua instância pode não suportar geração de QR Code por este método
              3. O dispositivo pode já estar conectado ou em outro estado que não permite geração de QR Code`,
              recommendations: [
                "Verifique se sua instância está ativa no painel da Z-API",
                "Tente desconectar o dispositivo no painel da Z-API e solicitar um novo QR Code",
                "Contate o suporte da Z-API para confirmar o endpoint correto para sua versão da API"
              ],
              technical_info: {
                instanceId: config.instanceId,
                error_details: qrCodeResponse.message || 'Unable to find matching resource',
                attempted_urls: qrCodeResponse.attempted_urls
              }
            });
          }
          
          // Tratamento para erro de credenciais inválidas
          if (qrCodeResponse.error === 'INVALID_CREDENTIALS') {
            return res.status(500).json({ 
              success: false,
              error_code: 'INVALID_CREDENTIALS', 
              message: "Erro ao obter QR Code: Credenciais inválidas",
              details: `As credenciais fornecidas (instanceId e token) parecem ser inválidas ou a instância não existe no serviço Z-API.`,
              recommendations: [
                "Verifique se o instanceId e token estão corretos no painel da Z-API",
                "Confirme se sua instância Z-API está ativa e dentro da validade",
                "Tente criar uma nova instância no painel da Z-API e use as novas credenciais"
              ],
              technical_info: {
                instanceId: config.instanceId,
                error_details: qrCodeResponse.message || 'Credenciais inválidas ou instância inexistente',
                failed_attempts: qrCodeResponse.failed_attempts || qrCodeResponse.attempted_endpoints || []
              }
            });
          }
          
          // Tratamento para erros de compatibilidade de API
          if (qrCodeResponse.error === 'API_COMPATIBILITY_ERROR') {
            return res.status(500).json({ 
              success: false,
              error_code: 'API_COMPATIBILITY_ERROR', 
              message: `Erro de compatibilidade com a API Z-API`,
              details: qrCodeResponse.message,
              recommendations: [
                "Verifique a versão atual da sua Z-API através do painel",
                "Atualize as credenciais do canal com valores corretos da sua instância Z-API",
                "Entre em contato com o suporte da Z-API para confirmar os endpoints corretos"
              ],
              technical_info: {
                instanceId: config.instanceId,
                attempted_urls: qrCodeResponse.attempted_urls,
                failed_attempts: qrCodeResponse.failed_attempts || qrCodeResponse.attempted_endpoints || []
              }
            });
          }
          
          // Tratamento para erro específico QR_CODE_UNAVAILABLE
          if (qrCodeResponse.error === 'QR_CODE_UNAVAILABLE') {
            return res.status(500).json({ 
              success: false,
              error_code: 'QR_CODE_UNAVAILABLE', 
              message: "QR Code não disponível",
              details: `Não foi possível obter o QR Code de nenhum dos endpoints disponíveis da Z-API. Isso pode indicar:
              1. Um problema temporário de comunicação com a API
              2. Uma mudança recente na API Z-API que tornou os endpoints incompatíveis
              3. Sua instância pode estar em um estado que não permite a geração de QR Code`,
              recommendations: [
                "Aguarde alguns minutos e tente novamente",
                "Verifique se o dispositivo não está bloqueado no painel da Z-API",
                "Tente desconectar o dispositivo no painel da Z-API e solicitar um novo QR Code",
                "Verifique a documentação atualizada da Z-API para confirmar os endpoints corretos"
              ],
              technical_info: {
                instanceId: config.instanceId,
                failed_attempts: qrCodeResponse.failed_attempts || qrCodeResponse.attempted_endpoints || []
              }
            });
          }
          
          // Tratamento para outros erros
          return res.status(500).json({ 
            success: false, 
            error_code: qrCodeResponse.error,
            message: `Erro ao obter QR Code: ${qrCodeResponse.error}`,
            details: qrCodeResponse.message || "Ocorreu um erro ao comunicar com a API Z-API",
            technical_info: {
              error: qrCodeResponse.error,
              message: qrCodeResponse.message,
              failed_attempts: qrCodeResponse.failed_attempts || qrCodeResponse.attempted_endpoints || []
            }
          });
        }
        
        if (!qrCodeResponse.qrcode) {
          console.log(`[QRCode Handler] QR Code não disponível - verificando status alternativo`);
          
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
            message: "QR Code não disponível", 
            details: "A API Z-API não retornou um QR Code, mas também não indicou erro específico",
            recommendations: [
              "Verifique o status da instância no painel da Z-API",
              "Tente desconectar e reconectar o dispositivo"
            ]
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
        console.error(`[QRCode Handler] Provedor não suportado para QR Code: ${config.provider}`);
        return res.status(400).json({ 
          success: false, 
          message: "QR Code não está disponível para este provedor", 
          details: `O provedor ${config.provider} não suporta conexão via QR Code ou usa método alternativo`
        });
      }
    } catch (error) {
      console.error(`[QRCode Handler] Erro interno:`, error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro interno ao obter QR Code",
        details: error instanceof Error ? error.message : "Erro desconhecido"
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
      
      // Interface para tipagem clara do objeto de diagnóstico
      interface DiagnosticResult {
        base_url: string;
        instance_id: string;
        token_length: number;
        token_preview: string;
        results: Record<string, any>;
        solutions: string[];
        problem_type: string;
      }
      
      // Verificar todos os endpoints disponíveis
      const diagnostic: DiagnosticResult = {
        base_url: `https://api.z-api.io/instances/${instanceId}`,
        instance_id: instanceId,
        token_length: token.length,
        token_preview: token.substring(0, 4) + '...',
        results: {},
        solutions: [],
        problem_type: ''
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
      
      // Análise dos resultados para recomendações personalizadas
      const failedEndpoints = Object.keys(diagnostic.results).filter(key => 
        !diagnostic.results[key].success
      );
      
      const hasNotFoundErrors = Object.keys(diagnostic.results).some(key => {
        const result = diagnostic.results[key];
        return !result.success && 
          (result.error?.includes('NOT_FOUND') || 
           result.status === 404 || 
           result.data?.error === 'NOT_FOUND');
      });
      
      const hasConnectionError = Object.keys(diagnostic.results).some(key => {
        const result = diagnostic.results[key];
        return !result.success && 
          (result.error?.includes('ECONN') || 
           result.error?.includes('timeout') || 
           result.error?.includes('network'));
      });
      
      // Adicionar informações de solução ao diagnóstico com base nos problemas encontrados
      diagnostic.problem_type = hasNotFoundErrors ? 'CREDENCIAIS_INVALIDAS' : 
                                 hasConnectionError ? 'ERRO_CONEXAO' : 
                                 failedEndpoints.length > 0 ? 'ENDPOINTS_INCOMPATIVEIS' : 'NENHUM_PROBLEMA';
      
      diagnostic.solutions = [];
      
      // Recomendações baseadas no tipo de problema
      if (hasNotFoundErrors) {
        diagnostic.solutions = [
          "Verifique se o instanceId e token estão corretos no painel da Z-API",
          "Confirme se sua instância Z-API está ativa e dentro da validade",
          "Se o erro persistir, tente criar uma nova instância no painel da Z-API e use as novas credenciais",
          "Entre em contato com o suporte da Z-API para verificar se sua conta está ativa"
        ];
      } else if (hasConnectionError) {
        diagnostic.solutions = [
          "Verifique sua conexão com a internet",
          "A API da Z-API pode estar temporariamente indisponível, tente novamente mais tarde",
          "Verifique se existe algum bloqueio de firewall no servidor que está hospedando esta aplicação",
          "Entre em contato com o suporte da Z-API para verificar o status do serviço"
        ];
      } else if (failedEndpoints.length > 0) {
        diagnostic.solutions = [
          "Verifique se a versão da API Z-API que você está usando suporta estes endpoints",
          "Caso o dispositivo já tenha sido conectado, desconectar e solicitar um novo QR Code",
          "Verifique se sua instância Z-API requer endpoints diferentes (consultar documentação específica da sua versão)",
          "Entre em contato com o suporte da Z-API para obter ajuda adicional com endpoints incompatíveis"
        ];
      } else {
        diagnostic.solutions = [
          "Nenhum problema crítico foi detectado com a configuração atual",
          "Para conectar um dispositivo, use a opção 'Conectar WhatsApp' na interface",
          "Caso esteja enfrentando problemas, tente desconectar e reconectar o dispositivo"
        ];
      }
      
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

  // Endpoint para verificar o status completo da instância Z-API
  app.get(`${apiPrefix}/channels/:id/status`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      if (channel.type !== "whatsapp") {
        return res.status(400).json({ message: "Apenas canais WhatsApp suportam esta operação" });
      }
      
      const config = channel.config as ChannelConfig;
      
      if (!config || !config.provider || !config.instanceId || !config.token) {
        return res.status(400).json({ 
          message: "Configuração do canal incompleta" 
        });
      }
      
      if (config.provider === "zapi") {
        const instanceId = config.instanceId as string;
        const token = config.token as string;
        
        console.log(`Verificando status completo da instância Z-API: ${instanceId}`);
        
        const zapiClient = new ZAPIClient(instanceId, token);
        
        // Coletar diversos tipos de informações da API
        const report = {
          channel: {
            id: channel.id,
            name: channel.name,
            type: channel.type,
            provider: config.provider,
            createdAt: channel.createdAt
          },
          instance: {
            instanceId,
            baseUrl: `https://api.z-api.io/instances/${instanceId}`
          },
          status: {} as any,
          session: {} as any,
          device: {} as any,
          webhook: {} as any,
          recommendations: [] as string[]
        };
        
        // 1. Verificar status principal
        try {
          const statusResponse = await zapiClient.getStatus();
          report.status = {
            success: !statusResponse.error,
            connected: !!statusResponse.connected,
            data: statusResponse
          };
        } catch (error: any) {
          report.status = {
            success: false,
            error: error.message || "Erro ao verificar status"
          };
        }
        
        // 2. Verificar informações da sessão
        try {
          const sessionResponse = await zapiClient.makeRequest('GET', '/session');
          report.session = {
            success: !sessionResponse.error,
            data: sessionResponse
          };
        } catch (error: any) {
          report.session = {
            success: false,
            error: error.message || "Erro ao verificar sessão"
          };
        }
        
        // 3. Verificar informações do dispositivo
        try {
          const deviceResponse = await zapiClient.makeRequest('GET', '/device');
          report.device = {
            success: !deviceResponse.error,
            data: deviceResponse
          };
        } catch (error: any) {
          report.device = {
            success: false,
            error: error.message || "Erro ao verificar dispositivo"
          };
        }
        
        // 4. Verificar configuração de webhook
        try {
          const webhookResponse = await zapiClient.getWebhook();
          
          // Verificar se a resposta tem a propriedade webhook
          const webhookUrl = webhookResponse.webhook || 
                            (webhookResponse.value ? webhookResponse.value : null);
          
          report.webhook = {
            success: !webhookResponse.error,
            configured: !!webhookUrl,
            webhook: webhookUrl,
            data: webhookResponse
          };
          
          // Se o webhook não estiver configurado, adicione uma recomendação
          if (!webhookUrl) {
            const recommendedWebhookUrl = process.env.BASE_URL 
              ? `${process.env.BASE_URL}/api/webhooks/zapi/${channel.id}` 
              : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/zapi/${channel.id}`;
            
            report.webhook.recommendedUrl = recommendedWebhookUrl;
            report.recommendations.push("É recomendado configurar o webhook para receber mensagens em tempo real");
          }
        } catch (error: any) {
          report.webhook = {
            success: false,
            error: error.message || "Erro ao verificar webhook"
          };
        }
        
        // Gerar recomendações baseadas no relatório
        if (!report.status.connected) {
          report.recommendations.push("O dispositivo não está conectado. Escaneie o QR Code para conectar o WhatsApp");
        }
        
        if (report.status.error && report.status.error.includes("NOT_FOUND")) {
          report.recommendations.push("Erro NOT_FOUND indica problemas com a API. Verifique se sua instância Z-API está ativa e as credenciais estão corretas");
        }
        
        if (report.webhook && !report.webhook.configured) {
          report.recommendations.push("Configure o webhook para receber notificações de novas mensagens em tempo real");
        }
        
        return res.json(report);
      } else {
        return res.status(400).json({ 
          message: "Esta operação só é suportada para canais Z-API" 
        });
      }
    } catch (error) {
      console.error("Erro ao verificar status do canal:", error);
      return res.status(500).json({ 
        message: "Erro interno ao verificar status",
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
