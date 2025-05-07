import { Express, Request, Response } from "express";
import { db } from "@db";
import { 
  channels,
  contacts,
  conversations,
  messages,
  users,
  insertMessageSchema
} from "@shared/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { broadcastToClients } from "../services/socket";
import { shouldAutoReply } from "../services/ai";

/**
 * Processa mensagens recebidas por webhook e aplica resposta automática quando apropriado
 * @param app Express app
 * @param apiPrefix Prefixo da API
 */
export function registerWebhookRoutes(app: Express, apiPrefix: string) {
  
  // Webhook genérico para receber mensagens de qualquer canal
  app.post(`${apiPrefix}/webhooks/message`, async (req: Request, res: Response) => {
    try {
      const { channel, phone, message, sender } = req.body;
      
      if (!channel || !phone || !message) {
        return res.status(400).json({ 
          error: "Missing required fields: channel, phone, message" 
        });
      }
      
      console.log(`[Webhook] Mensagem recebida de ${sender || phone}: ${message}`);
      
      // Processar mensagem
      // Implementação futura...
      
      return res.status(200).json({ 
        success: true,
        message: "Message processed successfully" 
      });
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
      return res.status(500).json({ 
        error: "Internal server error" 
      });
    }
  });

  // Webhook específico para mensagens do WhatsApp
  app.post(`${apiPrefix}/webhooks/whatsapp`, async (req: Request, res: Response) => {
    try {
      const { channelId, phone, message, sender } = req.body;
      
      if (!channelId || !phone || !message) {
        return res.status(400).json({ 
          error: "Missing required fields: channelId, phone, message" 
        });
      }
      
      console.log(`[WhatsApp Webhook] Mensagem de ${sender || phone}: ${message} para canal ${channelId}`);
      
      // Processar mensagem
      // Implementação futura...
      
      return res.status(200).json({ 
        success: true,
        message: "WhatsApp message processed successfully" 
      });
    } catch (error) {
      console.error("Erro ao processar webhook WhatsApp:", error);
      return res.status(500).json({ 
        error: "Internal server error" 
      });
    }
  });

  // Webhook específico para mensagens do WhatsApp via Meta
  app.post(`${apiPrefix}/webhooks/meta`, async (req: Request, res: Response) => {
    try {
      console.log("[Meta Webhook] Recebido:", req.body);
      
      // Verificar se é desafio de verificação
      if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"]) {
        const token = req.query["hub.verify_token"];
        // Verificação simplificada - em produção, use valor seguro e configurado
        if (token === "meu_token_secreto" || token === process.env.META_VERIFY_TOKEN) {
          console.log("[Meta Webhook] Verificação confirmada");
          return res.status(200).send(req.query["hub.challenge"]);
        } else {
          console.log("[Meta Webhook] Falha na verificação: token inválido");
          return res.status(403).json({ error: "Verification failed" });
        }
      }
      
      // Suporte simplificado para mensagens Meta
      // Na implementação completa, é necessário seguir o formato específico da Meta Platform
      return res.status(200).json({ 
        success: true,
        message: "Meta Platform webhook received" 
      });
    } catch (error) {
      console.error("Erro ao processar webhook Meta:", error);
      return res.status(500).json({ 
        error: "Internal server error" 
      });
    }
  });

  // Webhook específico para mensagens do WhatsApp via Z-API
  app.post(`${apiPrefix}/webhooks/zapi/:channelId`, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const isTestRequest = req.headers['x-webhook-test'] === 'true';
      
      // Log mais detalhado para depuração
      console.log(`[ZAPI Webhook] ${isTestRequest ? '[TESTE] ' : ''}Recebido para Canal ID: ${channelId}`);
      console.log('[ZAPI Webhook] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('[ZAPI Webhook] Body:', JSON.stringify(req.body, null, 2));
      console.log('[ZAPI Webhook] URL Completa:', req.originalUrl);
      console.log('[ZAPI Webhook] Método:', req.method);
      
      // Processar o webhook usando a função compartilhada
      const result = await processZapiWebhook(channelId, req.body, isTestRequest);
      return res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao processar webhook Z-API:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno ao processar webhook Z-API",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}

/**
 * Processa um webhook da Z-API
 * Função exportada para permitir testes e simulações
 */
export async function processZapiWebhook(channelId: number, webhook: any, isTestRequest = false) {
  try {
    // Verificar se é uma mensagem ou algum outro tipo de notificação
    // IMPORTANTE: Sempre responder com 200 para o Z-API, mesmo em caso de erro, 
    // para evitar tentativas de reenvio desnecessárias
    if (!webhook) {
      console.log('[ZAPI Webhook] ALERTA: Corpo da requisição vazio');
      return {
        success: true,
        message: "Webhook recebido, mas corpo vazio"
      };
    }
    
    // Log especial se for mensagem de verificação do Z-API
    if (webhook.event === 'verification' || (webhook.type === 'verification')) {
      console.log('[ZAPI Webhook] Evento de verificação recebido:', JSON.stringify(webhook, null, 2));
      return {
        success: true,
        message: "Verificação do Z-API recebida com sucesso"
      };
    }
    
    // Verificar se o canal existe
    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId)
    });
    
    if (!channel) {
      console.log(`[ZAPI Webhook] ERRO: Canal ${channelId} não encontrado`);
      // Mesmo com erro, responder com 200 para Z-API
      return { 
        success: false,
        error: "canal_not_found",
        message: "Canal não encontrado no sistema" 
      };
    }
    
    console.log(`[ZAPI Webhook] Canal encontrado: ${channel.name}, tipo: ${channel.type}`);
      
    // Atualizar as estatísticas de webhook no metadado do canal
    try {
      // Obter canal atual para acessar metadados
      const [currentChannel] = await db.select()
        .from(channels)
        .where(eq(channels.id, channelId));
        
      if (currentChannel) {
        // Preparar metadados atualizados
        const metadata = {
          ...(currentChannel.metadata || {}),
          lastWebhookReceived: new Date().toISOString(),
          webhookReceiveCount: ((currentChannel.metadata?.webhookReceiveCount || 0) + 1),
          lastWebhookBody: JSON.stringify(webhook).substring(0, 500) // Limitando tamanho
        };
        
        // Atualizar o canal
        await db.update(channels)
          .set({ metadata })
          .where(eq(channels.id, channelId));
          
        console.log(`[ZAPI Webhook] Estatísticas de webhook atualizadas para o canal ${channelId}`);
      }
    } catch (dbError) {
      // Apenas log de erro, não interrompe o fluxo
      console.error('[ZAPI Webhook] Erro ao atualizar estatísticas:', dbError);
    }

    // Normalizar os dados do webhook para um formato padrão
    // Z-API pode enviar diferentes formatos de evento
    let eventData = {
      isMessage: false,
      phone: '',
      text: '',
      messageId: '',
      senderName: '',
      timestamp: new Date(),
      isGroupMessage: false,
      mediaUrl: null,
      mediaType: null,
      fileName: null
    };
    
    // Tratar o formato mais recente da Z-API primeiro
    if (webhook?.value?.messageId) {
      // Nova versão (formato value)
      console.log('[Z-API] Processando novo formato (value):', webhook);
      const value = webhook.value;
      
      eventData.isMessage = true;
      eventData.phone = value.phone || value.from || '';
      eventData.text = value.message || value.text || value.body || '';
      eventData.messageId = value.messageId || value.id || '';
      eventData.senderName = value.senderName || value.name || '';
      eventData.timestamp = value.timestamp ? new Date(value.timestamp) : new Date();
      eventData.isGroupMessage = !!value.isGroup;
      
      // Verificar mídia
      if (value.isMedia || value.hasMedia || value.mediaType) {
        eventData.mediaType = value.mediaType || '';
        eventData.mediaUrl = value.mediaUrl || value.media?.url || '';
        eventData.fileName = value.fileName || value.media?.fileName || '';
      }
    }
    // Formato de callback de recebimento
    else if (webhook.type === 'ReceivedCallback' && webhook.phone) {
      console.log('[Z-API] Processando ReceivedCallback:', webhook);
      
      eventData.isMessage = true;
      eventData.phone = webhook.phone;
      eventData.text = webhook.text?.message || webhook.text || '';
      eventData.messageId = webhook.messageId || webhook.id || '';
      eventData.senderName = webhook.senderName || webhook.chatName || '';
      eventData.timestamp = webhook.momment ? new Date(webhook.momment) : new Date();
      eventData.isGroupMessage = !!webhook.isGroup;
    }
    // Formato principal baseado na documentação oficial do Z-API para mensagens recebidas
    // https://developer.z-api.io/webhooks/on-message-received
    else if (webhook.event === 'onMessageReceived' && webhook.phone) {
      console.log('[Z-API] Processando evento onMessageReceived:', webhook);
      
      eventData.isMessage = true;
      eventData.phone = webhook.phone;
      eventData.text = webhook.message || webhook.body || '';
      eventData.messageId = webhook.messageId || webhook.id || '';
      eventData.senderName = webhook.senderName || '';
      eventData.timestamp = webhook.timestamp ? new Date(webhook.timestamp) : new Date();
      eventData.isGroupMessage = !!webhook.isGroup;
    }
    // Verificar outros formatos de webhook (para manter compatibilidade com implementações anteriores)
    else if (webhook.phone && webhook.message) {
      // Formato simples de mensagem
      console.log('[Z-API] Processando formato simples de mensagem:', webhook);
      
      eventData.isMessage = true;
      eventData.phone = webhook.phone;
      eventData.text = webhook.message;
      eventData.messageId = webhook.messageId || webhook.id || '';
      eventData.senderName = webhook.senderName || webhook.name || '';
      eventData.timestamp = webhook.timestamp ? new Date(webhook.timestamp) : new Date();
    } else if (webhook.type === 'message') {
      // Formato de evento message
      console.log('[Z-API] Processando evento tipo message:', webhook);
      
      eventData.isMessage = true;
      eventData.phone = webhook.from || webhook.phone || '';
      eventData.text = webhook.body || webhook.content || webhook.text || '';
      eventData.messageId = webhook.id || webhook.messageId || '';
      eventData.senderName = webhook.sender?.name || webhook.senderName || '';
      eventData.timestamp = webhook.timestamp ? new Date(webhook.timestamp) : new Date();
      
      // Verificar se é mídia
      if (webhook.isMedia || webhook.hasMedia || webhook.mediaType) {
        eventData.mediaType = webhook.mediaType || '';
        eventData.mediaUrl = webhook.mediaUrl || webhook.media?.url || '';
        eventData.fileName = webhook.fileName || webhook.media?.fileName || '';
      }
    } else if (webhook.event === 'onMessage') {
      // Formato de evento onMessage
      console.log('[Z-API] Processando evento onMessage:', webhook);
      
      const messageData = webhook.message || webhook.data || webhook;
      eventData.isMessage = true;
      eventData.phone = messageData.phone || messageData.from || '';
      eventData.text = messageData.body || messageData.text || messageData.content || '';
      eventData.messageId = messageData.id || messageData.messageId || '';
      eventData.senderName = messageData.sender?.name || messageData.senderName || '';
      eventData.timestamp = messageData.timestamp ? new Date(messageData.timestamp) : new Date();
      
      // Verificar se é mensagem de grupo
      eventData.isGroupMessage = !!messageData.isGroup;
    }
    
    // Verificar se é uma notificação de status de mensagem que precisamos processar
    if (webhook.type === 'MessageStatusCallback' && webhook.ids && webhook.ids.length > 0) {
      console.log('[Z-API] Recebido status de mensagem:', webhook);
      
      // Se é um status de uma nova mensagem RECEBIDA e não temos ela no sistema,
      // vamos tentar simular uma mensagem recebida para evitar perder mensagens
      if ((webhook.status === 'RECEIVED' || webhook.status === 'READ') && 
          webhook.phone && !webhook.isGroup) {
        
        // Verificamos se é um telefone que ainda não temos conversa
        const existingConversation = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.channelId, channelId),
            sql`exists (
              select 1 from ${contacts} 
              where ${contacts.id} = ${conversations.contactId} 
              and ${contacts.phone} = ${webhook.phone}
            )`
          )
        });
        
        if (!existingConversation) {
          console.log(`[Z-API] Detectada possível mensagem nova de telefone desconhecido: ${webhook.phone}`);
          
          // Simular uma mensagem para criar o contato e a conversa
          eventData.isMessage = true;
          eventData.phone = webhook.phone;
          eventData.messageId = webhook.ids[0] || 'unknown-' + Date.now();
          eventData.text = "(Nova mensagem recebida)"; // Mensagem genérica
          eventData.timestamp = webhook.momment ? new Date(webhook.momment) : new Date();
          eventData.senderName = ""; // Nome desconhecido
        }
      }
    }
    
    // Se não for uma mensagem ou não tiver identificado o formato corretamente
    if (!eventData.isMessage || !eventData.phone) {
      console.log('[Z-API] Evento recebido não é uma mensagem ou formato não reconhecido:', webhook);
      return { 
        success: true, 
        message: "Evento não-mensagem ou formato desconhecido processado com sucesso" 
      };
    }
    
    // Log dos dados normalizados para depuração
    console.log('[Z-API] Dados da mensagem normalizados:', eventData);
    
    // Processar mensagem recebida
    if (eventData.isMessage && eventData.phone && eventData.text) {
      // Buscar ou criar contato pelo número do telefone
      let contact = await db.query.contacts.findFirst({
        where: eq(contacts.phone, eventData.phone)
      });
      
      if (!contact) {
        // Criar novo contato se não existir
        const [newContact] = await db.insert(contacts)
          .values({
            name: eventData.senderName || `Contato ${eventData.phone}`,
            phone: eventData.phone,
            email: null,
            source: "whatsapp",
            status: "lead",
            metadata: { 
              zapiSender: eventData.senderName,
              firstContact: new Date().toISOString()
            }
          })
          .returning();
          
        contact = newContact;
      }
      
      // Buscar ou criar conversa para o contato e canal
      let conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.contactId, contact.id),
          eq(conversations.channelId, channelId),
          eq(conversations.status, "active")
        )
      });
      
      if (!conversation) {
        // Criar nova conversa se não existir uma aberta
        const [newConversation] = await db.insert(conversations)
          .values({
            contactId: contact.id,
            channelId,
            status: "active",
            unreadCount: 1,
            lastMessageAt: new Date()
          })
          .returning();
          
        conversation = newConversation;
        
        // Notificar clientes sobre nova conversa
        broadcastToClients({
          type: 'conversation_created',
          data: {
            conversation: newConversation,
            contact
          }
        });
      } else {
        // Atualizar contagem de não lidos e timestamp da última mensagem
        await db.update(conversations)
          .set({
            unreadCount: sql`${conversations.unreadCount} + 1`,
            lastMessageAt: new Date()
          })
          .where(eq(conversations.id, conversation.id));
      }
      
      // Verificar se esta mensagem não é um eco de uma mensagem enviada pelo agente
      // PROBLEMA: Z-API às vezes envia um webhook de confirmação para mensagens enviadas pelo próprio agente
      // Isto pode causar duplicação de mensagens como se viessem do cliente
      
      // Verificar se já existe uma mensagem do agente com o mesmo conteúdo nos últimos segundos
      const recentAgentMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.conversationId, conversation.id),
          eq(messages.isFromAgent, true),
          eq(messages.content, eventData.text),
          // Mensagens enviadas nos últimos 30 segundos
          gte(messages.createdAt, new Date(Date.now() - 30 * 1000))
        ),
        orderBy: [desc(messages.createdAt)],
        limit: 1
      });
      
      // Se encontramos uma mensagem recente do agente com o mesmo conteúdo,
      // isso provavelmente é apenas um eco, então ignoramos
      if (recentAgentMessages.length > 0) {
        console.log(`[Z-API Webhook] Ignorando mensagem que parece ser eco de mensagem do agente: "${eventData.text}"`);
        return {
          success: true,
          message: "Mensagem ignorada por ser eco de mensagem do agente",
          ignored: true
        };
      }
      
      // Salvar a mensagem
      const messageData = {
        conversationId: conversation.id,
        content: eventData.text,
        isFromAgent: false,
        status: "delivered",
        metadata: {
          zapiMessageId: eventData.messageId,
          // Converter dado complexo para string JSON para evitar problemas de validação
          rawEventStr: JSON.stringify(eventData)
        }
      };
      
      const validation = insertMessageSchema.safeParse(messageData);
      
      if (!validation.success) {
        console.error('Erro de validação ao salvar mensagem Z-API:', validation.error);
        return { 
          success: false,
          message: "Erro de validação", 
          errors: validation.error.errors 
        };
      }
      
      const [message] = await db.insert(messages)
        .values(validation.data)
        .returning();
      
      // Notificar clientes sobre nova mensagem
      console.log(`[Z-API Webhook] Nova mensagem recebida e salva: ${message.id} de ${contact.name}`);
      
      // Buscar detalhes completos para enviar via WebSocket
      const fullMessage = {
        ...message,
        contact,
        conversation: {
          id: conversation.id,
          channelId: channel.id,
          channelType: channel.type,
          contactId: contact.id
        }
      };
      
      // Log para depuração
      console.log(`[Z-API Webhook] Enviando notificação em tempo real via WebSocket: ID=${message.id}`);
      
      try {
        // Utilizar o broadcastToClients global (importado em server/routes.ts)
        // @ts-ignore - O TypeScript não reconhece o broadcastToClients como global
        if (typeof global.broadcastToClients === 'function') {
          // @ts-ignore
          global.broadcastToClients({
            type: 'new_message',
            data: fullMessage
          });
          console.log('[Z-API Webhook] Notificação enviada via WebSocket com sucesso');
        } else {
          console.error('[Z-API Webhook] Erro: broadcastToClients não está disponível como função global');
          // Fallback para a versão local se disponível
          if (typeof broadcastToClients === 'function') {
            broadcastToClients({
              type: 'new_message',
              data: fullMessage
            });
            console.log('[Z-API Webhook] Notificação enviada via WebSocket local com sucesso');
          }
        }
      } catch (wsError) {
        console.error('[Z-API Webhook] Erro ao transmitir mensagem via WebSocket:', wsError);
      }
      
      // Verificar se deve enviar resposta automática
      // Obter as mensagens anteriores para contexto
      const previousMessages = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversation.id),
        orderBy: [desc(messages.createdAt)],
        limit: 10
      });
      
      const conversationHistory = previousMessages
        .reverse()
        .map(msg => `${msg.isFromAgent ? "Atendente" : "Cliente"}: ${msg.content}`)
        .join("\n");
      
      // Analisar se a mensagem deve receber resposta automática
      const autoReplyResult = await shouldAutoReply(eventData.text, conversationHistory);
      
      // Se deve responder automaticamente, enviar resposta
      if (autoReplyResult.shouldReply && autoReplyResult.suggestedReply && autoReplyResult.confidence > 0.7) {
        // Buscar um bot ou agente para atribuir a mensagem
        const bot = await db.query.users.findFirst({
          where: eq(users.username, "bot")
        });
        
        // Se não tem bot, usar o primeiro agente disponível
        const botId = bot?.id || 1; // Fallback para o primeiro usuário se não houver bot
        
        // Inserir a resposta automática
        const [autoReplyMessage] = await db.insert(messages)
          .values({
            conversationId: conversation.id,
            agentId: botId,
            content: autoReplyResult.suggestedReply,
            isFromAgent: true,
            status: "sent",
            metadata: { 
              isAutoReply: true,
              confidence: autoReplyResult.confidence
            }
          })
          .returning();
        
        // Notificar clientes sobre a resposta automática
        console.log(`[Z-API Webhook] Nova resposta automática para mensagem: ${autoReplyMessage.id}`);
        
        // Resposta completa com dados contextuais
        const fullAutoReply = {
          ...autoReplyMessage,
          contact,
          conversation: {
            id: conversation.id,
            channelId: channel.id,
            channelType: channel.type,
            contactId: contact.id
          }
        };
        
        try {
          // Utilizar o broadcastToClients global (importado em server/routes.ts)
          // @ts-ignore - O TypeScript não reconhece o broadcastToClients como global
          if (typeof global.broadcastToClients === 'function') {
            // @ts-ignore
            global.broadcastToClients({
              type: 'new_message',
              data: fullAutoReply
            });
            console.log('[Z-API Webhook] Notificação de resposta automática enviada via WebSocket');
          } else {
            console.error('[Z-API Webhook] Erro: global.broadcastToClients não disponível');
            // Fallback para a versão local se disponível
            if (typeof broadcastToClients === 'function') {
              broadcastToClients({
                type: 'new_message',
                data: fullAutoReply
              });
              console.log('[Z-API Webhook] Notificação enviada via broadcast local');
            }
          }
        } catch (wsError) {
          console.error('[Z-API Webhook] Erro ao transmitir resposta automática via WebSocket:', wsError);
        }
        
        // Enviar a resposta automática para o WhatsApp via Z-API
        try {
          // Importar serviço WhatsApp para envio de mensagens
          const whatsAppService = await import("../services/channels/whatsapp");
          
          // Enviar a mensagem para o contato via WhatsApp
          const sendResult = await whatsAppService.sendWhatsAppMessage(
            channel,
            contact.phone,
            autoReplyResult.suggestedReply
          );
          
          // Atualizar status da mensagem de acordo com o resultado do envio
          if (sendResult.status === "success") {
            await db.update(messages)
              .set({
                status: "delivered",
                metadata: {
                  ...autoReplyMessage.metadata,
                  externalMessageId: sendResult.messageId
                }
              })
              .where(eq(messages.id, autoReplyMessage.id));
              
            console.log(`[Z-API] Resposta automática enviada com sucesso para ${contact.phone}`);
          } else {
            console.error(`[Z-API] Erro ao enviar resposta automática: ${sendResult.message}`);
            
            // Atualizar status da mensagem para erro
            await db.update(messages)
              .set({
                status: "failed",
                metadata: {
                  ...autoReplyMessage.metadata,
                  error: sendResult.message
                }
              })
              .where(eq(messages.id, autoReplyMessage.id));
          }
        } catch (sendError) {
          console.error('[Z-API] Erro ao tentar enviar resposta automática:', sendError);
        }
        
        // Atribuir a conversa ao agente bot
        if (bot && !conversation.assignedTo) {
          await db.update(conversations)
            .set({ assignedTo: botId })
            .where(eq(conversations.id, conversation.id));
        }
      }
      
      return { 
        success: true, 
        messageId: message.id,
        autoReplied: autoReplyResult.shouldReply && autoReplyResult.confidence > 0.7
      };
    }
    
    // Resposta para outros tipos de mensagens
    return { 
      success: true, 
      message: "Evento processado com sucesso" 
    };
  } catch (error) {
    console.error('Erro ao processar webhook Z-API:', error);
    return { 
      success: false, 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}