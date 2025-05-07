import { db } from '@db';
import { channels } from '@shared/schema';
import { eq } from 'drizzle-orm';

type SimulateWebhookOptions = {
  channelId: number;
  phone: string;
  message: string;
  senderName: string;
  eventType: string;
};

/**
 * Simula um evento de webhook e passa para o handler de webhook
 * Útil para testar o fluxo de recebimento de mensagens
 */
export async function simulateWebhookMessage(options: SimulateWebhookOptions) {
  try {
    const { channelId, phone, message, senderName, eventType } = options;
    
    console.log(`[Simulação] Gerando evento webhook ${eventType} para canal ${channelId}`);
    
    // Verificar se o canal existe
    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId)
    });
    
    if (!channel) {
      console.error(`[Simulação] Canal ${channelId} não encontrado`);
      return {
        success: false,
        message: 'Canal não encontrado'
      };
    }
    
    // Construir o payload do webhook baseado no tipo de evento
    let webhookPayload: any = {};
    
    if (eventType === 'onMessageReceived') {
      webhookPayload = {
        event: 'onMessageReceived',
        instanceId: '3DF871A7ADFB20FB49998E66062CE0C1',
        phone,
        senderName,
        message,
        messageId: `SIMULATED_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } else if (eventType === 'message') {
      // Formato alternativo de mensagem
      webhookPayload = {
        type: 'message',
        fromMe: false,
        phone,
        senderName,
        body: message,
        id: `SIMULATED_${Date.now()}`,
        timestamp: Date.now()
      };
    } else if (eventType === 'DeliveryCallback') {
      // Simulação de callback de entrega
      webhookPayload = {
        event: 'status',
        status: 'READ',
        id: `SIMULATED_${Date.now()}`,
        messageId: `MESSAGE_${Date.now()}`,
        phone
      };
    } else {
      return {
        success: false,
        message: `Tipo de evento desconhecido: ${eventType}`
      };
    }
    
    console.log(`[Simulação] Enviando webhook simulado:`, webhookPayload);
    
    // Chamada direta ao endpoint do webhook
    const webhookUrl = `/api/webhooks/zapi/${channelId}`;
    
    // Fazer a chamada interna para o endpoint de webhook
    // em um ambiente de produção, você poderia usar fetch ou axios,
    // mas aqui vamos simular a chamada diretamente através do handler
    
    // Importar o handler de webhook dinamicamente para evitar dependências circulares
    const webhookHandler = await import('../../handlers/webhooks');
    
    // Chamar o manipulador de webhook diretamente com o payload simulado
    const result = await webhookHandler.processZapiWebhook(channelId, webhookPayload, true);
    
    return {
      success: true,
      message: 'Webhook simulado processado com sucesso',
      result,
      webhookPayload
    };
  } catch (error) {
    console.error('[Simulação] Erro ao simular webhook:', error);
    return {
      success: false,
      message: `Erro ao simular webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}