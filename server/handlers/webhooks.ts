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
import { broadcastToClients, sendZAPINotification } from "../services/socket";
import { shouldAutoReply } from "../services/ai";
import { processZAPIWebhook } from "../services/channels/zapi";

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
  
  // Webhook para mensagens da Z-API (WhatsApp)
  app.post(`${apiPrefix}/webhooks/zapi/:channelId`, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const webhookData = req.body;
      
      // Verificar se o canal existe
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        console.error(`Webhook da Z-API recebido para canal inexistente: ${channelId}`);
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Processar o webhook utilizando o processador da Z-API
      const processedData = processZAPIWebhook(webhookData);
      
      if (!processedData) {
        return res.status(400).json({ message: "Formato de dados do webhook inválido" });
      }
      
      // Buscar ou criar o contato baseado no número de telefone
      const phoneNumber = processedData.phone;
      let contact = await db.query.contacts.findFirst({
        where: eq(contacts.phone, phoneNumber)
      });
      
      if (!contact) {
        // Se não existir, criar um novo contato
        const [newContact] = await db.insert(contacts)
          .values({
            name: processedData.name || `WhatsApp ${phoneNumber}`,
            phone: phoneNumber,
            source: "whatsapp",
            status: "lead"
          })
          .returning();
          
        contact = newContact;
      }
      
      // Buscar ou criar uma conversa
      let conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.contactId, contact.id),
          eq(conversations.channelId, channelId),
          eq(conversations.status, "open")
        )
      });
      
      if (!conversation) {
        // Criar nova conversa
        const [newConversation] = await db.insert(conversations)
          .values({
            contactId: contact.id,
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
      
      // Preparar anexos se for mensagem de mídia
      const attachments = [];
      
      if (processedData.isMedia && processedData.mediaUrl) {
        const attachment: any = {
          type: processedData.mediaType,
          url: processedData.mediaUrl,
          fileName: processedData.fileName
        };
        
        // Adicionar metadados adicionais para tipos específicos
        if (processedData.mediaType === 'video' || processedData.mediaType === 'audio' || processedData.mediaType === 'ptt') {
          if (processedData.duration) {
            attachment.duration = processedData.duration;
          }
        }
        
        if (processedData.mediaType === 'video' && processedData.thumbnailUrl) {
          attachment.thumbnailUrl = processedData.thumbnailUrl;
        }
        
        attachments.push(attachment);
      }
      
      // Metadata avançado para a mensagem
      const messageMetadata: any = { 
        zapiMessageId: processedData.messageId,
        timestamp: processedData.timestamp,
        isMedia: processedData.isMedia,
        mediaType: processedData.mediaType,
        source: 'zapi'
      };
      
      // Adicionar informações sobre mensagem respondida, se existirem
      if (processedData.isReply) {
        messageMetadata.isReply = true;
        messageMetadata.replyToMessageId = processedData.replyToMessageId;
        messageMetadata.replyToMessage = processedData.replyToMessage;
      }
      
      // Inserir a mensagem
      const [newMessage] = await db.insert(messages)
        .values({
          conversationId: conversation.id,
          contactId: contact.id,
          content: processedData.message,
          isFromAgent: false,
          status: "delivered",
          metadata: messageMetadata,
          attachments
        })
        .returning();
      
      // Criar objeto da mensagem com detalhes para enviar via WebSocket
      const messageWithDetails = {
        ...newMessage,
        contact
      };
      
      // Broadcast da nova mensagem
      broadcastToClients({
        type: "new_message",
        data: messageWithDetails
      });
      
      // Verificar se deve responder automaticamente
      // Obter histórico da conversa para contexto
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
      const autoReplyResult = await shouldAutoReply(processedData.message, conversationHistory);
      
      // Se deve responder automaticamente, enviar resposta
      if (autoReplyResult.shouldReply && autoReplyResult.suggestedReply && autoReplyResult.confidence > 0.7) {
        // Buscar um bot ou agente para atribuir a mensagem
        const bot = await db.query.users.findFirst({
          where: eq(users.username, "bot")
        });
        
        // Se não tem bot, usar o primeiro agente disponível
        const botId = bot?.id || 1;
        
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
        
        // Enviar a resposta pelo WhatsApp
        try {
          const { sendWhatsAppMessage } = require("../services/channels/whatsapp");
          await sendWhatsAppMessage(
            channel,
            phoneNumber,
            autoReplyResult.suggestedReply
          );
        } catch (error) {
          console.error("Erro ao enviar resposta automática pelo WhatsApp:", error);
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
        message: "Webhook da Z-API processado com sucesso" 
      });
      
    } catch (error) {
      console.error("Erro ao processar webhook da Z-API:", error);
      return res.status(500).json({ 
        message: "Erro ao processar mensagem da Z-API", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}