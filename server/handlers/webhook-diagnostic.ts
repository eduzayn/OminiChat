import { Express } from "express";
import { db } from "@db";
import { channels } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  checkConnectionStatus, 
  configureWebhook, 
  checkWebhookStatus 
} from "../services/channels/zapi";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

export function registerWebhookDiagnosticRoute(app: Express, apiPrefix: string) {
  // Endpoint para diagnóstico completo do webhook
  app.post(`${apiPrefix}/channels/:id/diagnose-webhook`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      console.log(`[WebhookDiagnostic] Requisição para Canal ID: ${channelId}, Usuário ID: ${userId}`);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        console.log(`[WebhookDiagnostic] Canal ${channelId} não encontrado`);
        return res.status(404).json({
          success: false,
          message: "Canal não encontrado"
        });
      }
      
      console.log(`[WebhookDiagnostic] Canal ${channelId} encontrado: ${channel.name}, tipo: ${channel.type}`);
      
      // Verificar se é um canal do tipo WhatsApp
      if (channel.type !== "whatsapp") {
        console.log(`[WebhookDiagnostic] Canal ${channelId} não é do tipo WhatsApp, é ${channel.type}`);
        return res.status(400).json({
          success: false,
          message: "Apenas canais WhatsApp suportam diagnóstico de webhook"
        });
      }
      
      // Verificar se é um canal da Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        console.log(`[WebhookDiagnostic] Canal ${channelId} não é da Z-API, é ${channel.config?.provider || 'sem provedor'}`);
        return res.status(400).json({
          success: false,
          message: "Apenas canais Z-API suportam diagnóstico de webhook"
        });
      }
      
      // Realizar diagnóstico completo do webhook
      console.log(`[WebhookDiagnostic] Iniciando diagnóstico completo para o canal ${channelId}...`);
      
      // 1. Verificar status da conexão
      console.log(`[WebhookDiagnostic] Verificando status da conexão...`);
      const connectionStatus = await checkConnectionStatus(channel);
      
      // 2. Verificar status atual do webhook
      console.log(`[WebhookDiagnostic] Verificando status do webhook atual...`);
      const webhookStatus = await checkWebhookStatus(channel);
      
      // 3. Tentar reconfigurar o webhook
      console.log(`[WebhookDiagnostic] Reconfigurando webhook...`);
      const webhookConfiguration = await configureWebhook(channel);
      
      // 4. Verificar novamente o status para confirmar a configuração
      console.log(`[WebhookDiagnostic] Verificando status após reconfiguração...`);
      const newWebhookStatus = await checkWebhookStatus(channel);
      
      // Compilar relatório de diagnóstico
      const diagnosticReport = {
        channelId,
        channelName: channel.name,
        connectionStatus: {
          connected: connectionStatus.connected === true,
          status: connectionStatus.status,
          message: connectionStatus.message
        },
        webhookInitialStatus: {
          configured: webhookStatus.configured === true,
          status: webhookStatus.status,
          message: webhookStatus.message,
          webhookUrl: webhookStatus.webhookUrl
        },
        webhookReconfiguration: {
          success: webhookConfiguration.status === "success",
          message: webhookConfiguration.message,
          webhookUrl: webhookConfiguration.webhookUrl
        },
        webhookFinalStatus: {
          configured: newWebhookStatus.configured === true,
          status: newWebhookStatus.status,
          message: newWebhookStatus.message,
          webhookUrl: newWebhookStatus.webhookUrl
        },
        channelMetadata: {
          lastWebhookReceived: channel.metadata?.lastWebhookReceived || null,
          webhookReceiveCount: channel.metadata?.webhookReceiveCount || 0,
          lastWebhookSetup: channel.metadata?.lastWebhookSetup || null,
          lastWebhookBody: channel.metadata?.lastWebhookBody || null
        },
        recommendation: ""
      };
      
      // Adicionar recomendação baseada no diagnóstico
      if (!connectionStatus.connected) {
        diagnosticReport.recommendation = "O dispositivo não está conectado ao WhatsApp. Escaneie o QR Code para conectar o dispositivo antes de configurar o webhook.";
      } else if (!newWebhookStatus.configured) {
        diagnosticReport.recommendation = "O webhook não pôde ser configurado. Verifique as credenciais Z-API e tente novamente.";
      } else if (channel.metadata?.webhookReceiveCount === 0) {
        diagnosticReport.recommendation = "O webhook foi configurado, mas ainda não recebeu nenhuma mensagem. Envie uma mensagem de teste para o número conectado.";
      } else {
        diagnosticReport.recommendation = "O webhook está configurado e funcionando corretamente.";
      }
      
      console.log(`[WebhookDiagnostic] Diagnóstico completo: ${JSON.stringify(diagnosticReport, null, 2)}`);
      return res.json({
        success: true,
        diagnosticReport
      });
    } catch (error) {
      console.error("[WebhookDiagnostic] Erro ao diagnosticar webhook:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao diagnosticar webhook",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint de teste para simular um webhook Z-API
  app.post(`${apiPrefix}/test-webhook/:channelId`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const userId = req.session.userId;
      const simulatedPayload = req.body;
      
      console.log(`[WebhookTest] Simulando webhook para canal ${channelId} pelo usuário ${userId}`);
      console.log(`[WebhookTest] Payload: ${JSON.stringify(simulatedPayload, null, 2)}`);
      
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
      
      // Criar payload padrão se não fornecido
      const testPayload = simulatedPayload || {
        event: "onMessageReceived",
        phone: "5511999999999",
        message: "Esta é uma mensagem de teste via webhook simulado",
        messageId: `test_msg_${Date.now()}`,
        senderName: "Contato de Teste",
        timestamp: new Date().toISOString()
      };
      
      // Fazer uma chamada para o endpoint do webhook interno
      const webhookUrl = `/api/webhooks/zapi/${channelId}`;
      
      console.log(`[WebhookTest] Enviando payload para endpoint interno: ${webhookUrl}`);
      
      // Fazer a chamada diretamente para o handler de webhook dentro da mesma aplicação
      try {
        // Criar uma nova requisição para o endpoint do webhook
        const webhookResponse = await axios.post(
          `http://localhost:5000${webhookUrl}`, // Usando localhost porque é o mesmo processo
          testPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Test': 'true' // Para identificar que é um teste
            }
          }
        );
        
        console.log(`[WebhookTest] Resposta do webhook: ${JSON.stringify(webhookResponse.data, null, 2)}`);
        
        return res.json({
          success: true,
          message: "Webhook simulado enviado com sucesso",
          webhookResponse: webhookResponse.data
        });
      } catch (webhookError) {
        console.error(`[WebhookTest] Erro ao chamar o webhook interno:`, webhookError);
        
        return res.status(500).json({
          success: false,
          message: "Erro ao processar webhook internamente",
          error: webhookError instanceof Error ? webhookError.message : "Erro desconhecido"
        });
      }
    } catch (error) {
      console.error("[WebhookTest] Erro ao simular webhook:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao simular webhook",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para verificar status do webhook com detalhes adicionais (ROTA DESABILITADA)
  // IMPORTANTE: Esta rota foi desabilitada porque estava conflitando com uma rota idêntica em channels.ts
  app.get(`${apiPrefix}/webhook-diagnostic/channel/:id/status`, isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      console.log(`[WebhookStatus Diagnostic] Requisição para Canal ID: ${channelId}, Usuário ID: ${userId}`);
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        console.log(`[WebhookStatus Diagnostic] Canal ${channelId} não encontrado`);
        return res.status(404).json({
          success: false,
          message: "Canal não encontrado"
        });
      }
      
      // Verificar se é um canal do tipo WhatsApp
      if (channel.type !== "whatsapp") {
        return res.status(400).json({
          success: false,
          message: "Apenas canais WhatsApp suportam verificação de webhook"
        });
      }
      
      // Verificar se é um canal da Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        return res.status(400).json({
          success: false,
          message: "Apenas canais Z-API suportam verificação de webhook"
        });
      }
      
      // Verificar status do webhook
      console.log(`[WebhookStatus] Verificando status do webhook para canal ${channelId}...`);
      const webhookStatus = await checkWebhookStatus(channel);
      
      // Enriquecer o status adicionando URL do webhook atual e dados do último recebimento
      const enrichedStatus = {
        ...webhookStatus,
        // Adicionar metadados do canal se disponíveis
        webhookUrl: channel.metadata?.webhookUrl || webhookStatus.webhookUrl,
        lastReceived: channel.metadata?.lastWebhookReceived || null,
        receiveCount: channel.metadata?.webhookReceiveCount || 0,
        lastSetup: channel.metadata?.lastWebhookSetup || null
      };
      
      console.log(`[WebhookStatus] Status enriquecido: ${JSON.stringify(enrichedStatus, null, 2)}`);
      return res.json(enrichedStatus);
    } catch (error) {
      console.error("[WebhookStatus] Erro ao verificar status do webhook:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao verificar status do webhook",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}