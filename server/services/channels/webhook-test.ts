/**
 * webhook-test.ts
 * Serviço para simular mensagens recebidas via webhook
 */

import axios from 'axios';

interface WebhookTestOptions {
  channelId: number;
  phone?: string;
  senderName?: string;
  message?: string;
  eventType?: string;
}

/**
 * Simula uma mensagem recebida para testes de webhook
 */
export async function simulateWebhookMessage(options: WebhookTestOptions) {
  const {
    channelId,
    phone = '5511999999999',
    senderName = 'Contato Teste Simulado',
    message = 'Esta é uma mensagem de teste do webhook simulado',
    eventType = 'onMessageReceived'
  } = options;

  // Gera um messageId único para cada teste
  const messageId = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // URL base
  const baseUrl = process.env.BASE_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
  const webhookUrl = `${baseUrl}/api/webhooks/zapi/${channelId}`;
  
  // Constrói payload de acordo com o tipo de evento
  let payload: any = {};
  
  if (eventType === 'onMessageReceived') {
    // Formato para mensagem recebida (formato documentado da Z-API)
    payload = {
      phone,
      senderName,
      message,
      messageId,
      instanceId: "3DF871A7ADFB20FB49998E66062CE0C1",
      timestamp: new Date().getTime(),
      event: 'onMessageReceived',
      isGroup: false
    };
  } else if (eventType === 'message') {
    // Formato alternativo
    payload = {
      from: phone,
      sender: {
        name: senderName
      },
      body: message,
      id: messageId,
      type: 'message',
      timestamp: new Date().getTime()
    };
  } else if (eventType === 'DeliveryCallback') {
    // Formato de callback de entrega
    payload = {
      phone,
      messageId,
      status: 'DELIVERED',
      type: 'DeliveryCallback',
      instanceId: "3DF871A7ADFB20FB49998E66062CE0C1",
      timestamp: new Date().getTime()
    };
  }
  
  // Define cabeçalho para marcar como simulação
  const headers = {
    'Content-Type': 'application/json',
    'X-Webhook-Test': 'true'
  };
  
  try {
    // Envia a requisição POST para o webhook
    const response = await axios.post(webhookUrl, payload, { headers });
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      messageId,
      webhookUrl,
      payload
    };
  } catch (error: any) {
    console.error('Erro ao simular webhook:', error.message);
    return {
      success: false,
      error: error.message,
      messageId,
      webhookUrl,
      payload
    };
  }
}