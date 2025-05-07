import { Express, Request, Response } from "express";
import { db } from "@db";
import { 
  conversations, 
  messages, 
  contacts,
  channels,
  users,
  insertMessageSchema
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
      // Extrair dados da mensagem
      const {
        channelId,
        contactId, 
        content,
        attachments,
        metadata
      } = req.body;
      
      if (!channelId || !contactId || !content) {
        return res.status(400).json({ 
          message: "Dados incompletos. Forneça channelId, contactId e content." 
        });
      }
      
      // Verificar se o canal existe
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Verificar se o contato existe
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      // Buscar ou criar uma conversa para o contato e canal
      let conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.contactId, contactId),
          eq(conversations.channelId, channelId),
          eq(conversations.status, "open")
        )
      });
      
      if (!conversation) {
        // Criar nova conversa se não existir uma aberta
        const [newConversation] = await db.insert(conversations)
          .values({
            contactId,
            channelId,
            status: "open",
            unreadCount: 1,
            lastMessageAt: new Date()
          })
          .returning();
          
        conversation = newConversation;
      } else {
        // Atualizar conversa existente
        await db.update(conversations)
          .set({ 
            lastMessageAt: new Date(),
            unreadCount: sql`${conversations.unreadCount} + 1` 
          })
          .where(eq(conversations.id, conversation.id));
      }
      
      // Inserir a mensagem do cliente
      const [newMessage] = await db.insert(messages)
        .values({
          conversationId: conversation.id,
          contactId,
          content,
          isFromAgent: false,
          status: "delivered",
          metadata: metadata || {},
          attachments: attachments || []
        })
        .returning();
      
      // Criar objeto da mensagem com detalhes para enviar via WebSocket
      const messageWithDetails = {
        ...newMessage,
        contact
      };
      
      // Broadcast da nova mensagem
      console.log("Enviando nova mensagem via WebSocket:", messageWithDetails);
      broadcastToClients({
        type: "new_message",
        data: messageWithDetails
      });
      
      // Verificar se deve responder automaticamente
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
      const autoReplyResult = await shouldAutoReply(content, conversationHistory);
      
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
          
        // Buscar detalhes do bot/agente
        const agent = await db.query.users.findFirst({
          where: eq(users.id, botId)
        });
        
        // Criar objeto da mensagem para broadcast
        const autoReplyWithDetails = {
          ...autoReplyMessage,
          agent: agent 
            ? { 
                id: agent.id, 
                name: agent.name, 
                username: agent.username,
                role: agent.role,
                avatarUrl: agent.avatarUrl
              } 
            : undefined,
          contact
        };
        
        // Broadcast da resposta automática
        broadcastToClients({
          type: "new_message",
          data: autoReplyWithDetails
        });
        
        // Atribuir a conversa ao agente bot
        if (bot && !conversation.assignedTo) {
          await db.update(conversations)
            .set({ assignedTo: botId })
            .where(eq(conversations.id, conversation.id));
        }
      }
      
      return res.status(201).json({ 
        success: true, 
        message: "Mensagem processada com sucesso",
        autoReplied: autoReplyResult.shouldReply && autoReplyResult.confidence > 0.7
      });
      
    } catch (error) {
      console.error("Erro ao processar webhook de mensagem:", error);
      return res.status(500).json({ 
        message: "Erro ao processar mensagem", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Webhook para mensagens do WhatsApp
  app.post(`${apiPrefix}/webhooks/whatsapp`, async (req: Request, res: Response) => {
    try {
      const { body } = req;
      
      // Verificação básica de que é uma mensagem válida do WhatsApp
      if (!body || !body.from || !body.message) {
        return res.status(400).json({ message: "Formato de mensagem inválido" });
      }
      
      // Aqui faria a lógica específica para extrair os dados da mensagem do WhatsApp
      // e então chamaria o mesmo fluxo do webhook genérico
      
      // Por simplicidade, vamos redirecionar para o webhook genérico
      // Na implementação real, isso seria mais detalhado e específico para o formato do WhatsApp
      
      // Exemplo simplificado:
      const channelId = 1; // Canal WhatsApp
      const contactPhone = body.from;
      
      // Buscar contato pelo número de telefone
      let contact = await db.query.contacts.findFirst({
        where: eq(contacts.phone, contactPhone)
      });
      
      // Se o contato não existir, criar um novo
      if (!contact) {
        const [newContact] = await db.insert(contacts)
          .values({
            name: `WhatsApp ${contactPhone}`,
            phone: contactPhone,
            source: "whatsapp",
            status: "lead"
          })
          .returning();
          
        contact = newContact;
      }
      
      // Redirecionar para o webhook genérico
      req.body = {
        channelId,
        contactId: contact.id,
        content: body.message,
        attachments: body.attachments || [],
        metadata: {
          whatsappId: body.messageId,
          whatsappFrom: body.from,
          timestamp: body.timestamp
        }
      };
      
      // Chamar o handler do webhook genérico
      return res.status(200).json({ 
        success: true, 
        message: "Mensagem WhatsApp processada com sucesso" 
      });
      
    } catch (error) {
      console.error("Erro ao processar webhook do WhatsApp:", error);
      return res.status(500).json({ 
        message: "Erro ao processar mensagem do WhatsApp", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Webhook para mensagens do Facebook/Instagram
  app.post(`${apiPrefix}/webhooks/meta`, async (req: Request, res: Response) => {
    try {
      // Código específico para processar webhooks da Meta
      // Seria a implementação real das mensagens do Facebook/Instagram
      
      return res.status(200).json({ 
        success: true, 
        message: "Webhook Meta (FB/IG) processado com sucesso" 
      });
      
    } catch (error) {
      console.error("Erro ao processar webhook Meta:", error);
      return res.status(500).json({ 
        message: "Erro ao processar mensagem do Facebook/Instagram", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Webhook para Z-API
  app.post(`${apiPrefix}/webhooks/zapi/:channelId`, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      console.log(`[ZAPI Webhook] Recebido para Canal ID: ${channelId}`);
      console.log('[ZAPI Webhook] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('[ZAPI Webhook] Body:', JSON.stringify(req.body, null, 2));
      
      // Verificar se é uma mensagem ou algum outro tipo de notificação
      const webhook = req.body;
      
      // IMPORTANTE: Sempre responder com 200 para o Z-API, mesmo em caso de erro, 
      // para evitar tentativas de reenvio desnecessárias
      if (!webhook) {
        console.log('[ZAPI Webhook] ALERTA: Corpo da requisição vazio');
        return res.status(200).json({
          success: true,
          message: "Webhook recebido, mas corpo vazio"
        });
      }
      
      // Log especial se for mensagem de verificação do Z-API
      if (webhook.event === 'verification' || (webhook.type === 'verification')) {
        console.log('[ZAPI Webhook] Evento de verificação recebido:', JSON.stringify(webhook, null, 2));
        return res.status(200).json({
          success: true,
          message: "Verificação do Z-API recebida com sucesso"
        });
      }
      
      // Verificar se o canal existe
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        console.log(`[ZAPI Webhook] ERRO: Canal ${channelId} não encontrado`);
        // Mesmo com erro, responder com 200 para Z-API
        return res.status(200).json({ 
          success: false,
          error: "canal_not_found",
          message: "Canal não encontrado no sistema" 
        });
      }
      
      console.log(`[ZAPI Webhook] Canal encontrado: ${channel.name}, tipo: ${channel.type}`);
      
      // Atualizar as estatísticas de webhook no metadado do canal
      try {
        const { db } = await import("../../db");
        const { channels } = await import("../../shared/schema");
        const { eq } = await import("drizzle-orm");
        
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
      
      // Se não for uma mensagem ou não tiver identificado o formato corretamente
      if (!eventData.isMessage || !eventData.phone) {
        console.log('[Z-API] Evento recebido não é uma mensagem ou formato não reconhecido:', webhook);
        return res.status(200).json({ 
          success: true, 
          message: "Evento não-mensagem ou formato desconhecido processado com sucesso" 
        });
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
        
        // Salvar a mensagem
        const messageData = {
          conversationId: conversation.id,
          content: eventData.text,
          isFromAgent: false,
          status: "delivered",
          metadata: {
            zapiMessageId: eventData.messageId,
            rawEvent: eventData
          }
        };
        
        const validation = insertMessageSchema.safeParse(messageData);
        
        if (!validation.success) {
          console.error('Erro de validação ao salvar mensagem Z-API:', validation.error);
          return res.status(400).json({ 
            message: "Erro de validação", 
            errors: validation.error.errors 
          });
        }
        
        const [message] = await db.insert(messages)
          .values(validation.data)
          .returning();
        
        // Notificar clientes sobre nova mensagem
        broadcastToClients({
          type: 'new_message',
          data: {
            ...message,
            contact
          }
        });
        
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
          broadcastToClients({
            type: 'new_message',
            data: {
              ...autoReplyMessage,
              contact
            }
          });
          
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
        
        return res.status(200).json({ 
          success: true, 
          messageId: message.id,
          autoReplied: autoReplyResult.shouldReply && autoReplyResult.confidence > 0.7
        });
      }
      
      // Resposta para outros tipos de mensagens
      return res.status(200).json({ 
        success: true, 
        message: "Evento processado com sucesso" 
      });
    } catch (error) {
      console.error('Erro ao processar webhook Z-API:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });
}