import { Express } from "express";
import { db } from "@db";
import { 
  conversations, 
  messages, 
  contacts, 
  channels,
  insertMessageSchema,
  users,
  activities,
  InsertMessage
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { broadcastToClients } from "../services/socket";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

export function registerConversationRoutes(app: Express, apiPrefix: string) {
  // Get all conversations
  app.get(`${apiPrefix}/conversations`, isAuthenticated, async (req, res) => {
    try {
      // Get query params for filtering
      const status = req.query.status as string;
      const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
      const assignedTo = req.query.assignedTo === "me" 
        ? req.session.userId 
        : req.query.assignedTo 
          ? parseInt(req.query.assignedTo as string) 
          : undefined;
      const unassigned = req.query.unassigned === "true";
      
      // Build query conditions
      let query = db.select({
        id: conversations.id,
        contactId: conversations.contactId,
        channelId: conversations.channelId,
        assignedTo: conversations.assignedTo,
        status: conversations.status,
        unreadCount: conversations.unreadCount,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations);
      
      const conditions = [];
      
      if (status) {
        conditions.push(eq(conversations.status, status));
      }
      
      if (channelId) {
        conditions.push(eq(conversations.channelId, channelId));
      }
      
      if (assignedTo) {
        conditions.push(eq(conversations.assignedTo, assignedTo));
      } else if (unassigned) {
        conditions.push(sql`${conversations.assignedTo} IS NULL`);
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const allConversations = await query.orderBy(desc(conversations.lastMessageAt));
      
      // Get related data for each conversation
      const conversationsWithDetails = await Promise.all(
        allConversations.map(async (conversation) => {
          const contact = await db.query.contacts.findFirst({
            where: eq(contacts.id, conversation.contactId)
          });
          
          const channel = await db.query.channels.findFirst({
            where: eq(channels.id, conversation.channelId)
          });
          
          const assignedUser = conversation.assignedTo 
            ? await db.query.users.findFirst({
                where: eq(users.id, conversation.assignedTo)
              })
            : undefined;
            
          // Get last message
          const lastMessages = await db.query.messages.findMany({
            where: eq(messages.conversationId, conversation.id),
            orderBy: [desc(messages.createdAt)],
            limit: 1
          });
          
          const lastMessage = lastMessages[0];
          
          return {
            ...conversation,
            contact: contact!,
            channel: channel!,
            assignedUser: assignedUser 
              ? { 
                  id: assignedUser.id, 
                  name: assignedUser.name, 
                  username: assignedUser.username,
                  role: assignedUser.role,
                  avatarUrl: assignedUser.avatarUrl
                } 
              : undefined,
            lastMessage
          };
        })
      );
      
      return res.json(conversationsWithDetails);
      
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get conversation by ID
  app.get(`${apiPrefix}/conversations/:id`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
      });
      
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      const assignedUser = conversation.assignedTo 
        ? await db.query.users.findFirst({
            where: eq(users.id, conversation.assignedTo)
          })
        : undefined;
        
      // Get last message
      const lastMessages = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversation.id),
        orderBy: [desc(messages.createdAt)],
        limit: 1
      });
      
      const lastMessage = lastMessages[0];
      
      return res.json({
        ...conversation,
        contact,
        channel,
        assignedUser: assignedUser 
          ? { 
              id: assignedUser.id, 
              name: assignedUser.name, 
              username: assignedUser.username,
              role: assignedUser.role,
              avatarUrl: assignedUser.avatarUrl
            } 
          : undefined,
        lastMessage
      });
      
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get messages for conversation
  app.get(`${apiPrefix}/conversations/:id/messages`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Get all messages for the conversation
      const allMessages = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: [asc(messages.createdAt)]
      });
      
      // Get related data for each message
      const messagesWithDetails = await Promise.all(
        allMessages.map(async (message) => {
          const agent = message.agentId 
            ? await db.query.users.findFirst({
                where: eq(users.id, message.agentId)
              })
            : undefined;
            
          const contact = await db.query.contacts.findFirst({
            where: eq(contacts.id, conversation.contactId)
          });
          
          return {
            ...message,
            agent: agent 
              ? { 
                  id: agent.id, 
                  name: agent.name, 
                  username: agent.username,
                  role: agent.role,
                  avatarUrl: agent.avatarUrl
                } 
              : undefined,
            contact: contact!
          };
        })
      );
      
      // Reset unread count after fetching messages
      if (conversation.unreadCount > 0) {
        await db
          .update(conversations)
          .set({ unreadCount: 0 })
          .where(eq(conversations.id, conversationId));
      }
      
      return res.json(messagesWithDetails);
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Send a message
  app.post(`${apiPrefix}/conversations/:id/messages`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      // Validate request body
      const validation = insertMessageSchema.safeParse({
        ...req.body,
        conversationId
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid message data", 
          errors: validation.error.errors 
        });
      }
      
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Buscar o canal para verificar se é Z-API
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      // Buscar o contato para obter o número de telefone
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const messageData: Partial<InsertMessage> = {
        conversationId,
        content: req.body.content,
        isFromAgent: req.body.isFromAgent || false
      };
      
      // If message is from agent, add agent ID
      if (messageData.isFromAgent) {
        messageData.agentId = req.session.userId;
      } else {
        // If message is from contact, add contact ID
        messageData.contactId = conversation.contactId;
      }
      
      // Insert message
      // Garantir que todos os campos obrigatórios estejam presentes
      // Certifique-se de que conversationId e content são números/strings válidos
      if (typeof messageData.conversationId !== 'number' || 
          typeof messageData.content !== 'string' || 
          !messageData.content.trim()) {
        return res.status(400).json({ message: "Invalid message data: content and conversationId are required" });
      }
      
      // Status inicial - será atualizado com base no resultado do envio externo
      let messageStatus = "sent";
      let externalMessageId = null;
      
      // Se a mensagem é de um agente e o canal é WhatsApp, enviar para o canal apropriado
      if (messageData.isFromAgent && channel.type === "whatsapp") {
        try {
          // Importar serviço WhatsApp que roteará para o provedor correto (Z-API, Meta, etc.)
          const whatsAppService = await import("../services/channels/whatsapp");
          
          console.log(`Enviando mensagem WhatsApp para ${contact.phone} via ${channel.config?.provider || 'padrão'}: "${messageData.content}"`);
          
          // Usar o serviço central de WhatsApp que roteia para Z-API ou outro provedor
          const result = await whatsAppService.sendWhatsAppMessage(
            channel, 
            contact.phone, 
            messageData.content
          );
          
          if (result.status === "success") {
            messageStatus = "delivered";
            externalMessageId = result.messageId;
            console.log(`Mensagem WhatsApp enviada com sucesso, ID: ${result.messageId}`);
          } else {
            console.error(`Erro ao enviar mensagem WhatsApp: ${result.message}`);
            messageStatus = "failed";
          }
        } catch (error) {
          console.error("Erro ao enviar mensagem WhatsApp:", error);
          messageStatus = "failed";
        }
      }
      
      const validMessageData = {
        conversationId: messageData.conversationId,
        content: messageData.content,
        isFromAgent: messageData.isFromAgent === true,
        agentId: messageData.agentId || null,
        contactId: messageData.contactId || null,
        status: messageStatus,
        metadata: externalMessageId ? { externalMessageId } : {}
      };
      
      const [newMessage] = await db
        .insert(messages)
        .values([validMessageData])
        .returning();
      
      // Update conversation lastMessageAt
      await db
        .update(conversations)
        .set({ 
          lastMessageAt: new Date(),
          unreadCount: messageData.isFromAgent 
            ? 0 
            : sql`${conversations.unreadCount} + 1`
        })
        .where(eq(conversations.id, conversationId));
        
      // Create activity for contact
      if (messageData.isFromAgent) {
        await db.insert(activities).values({
          contactId: conversation.contactId,
          type: "conversation",
          description: "Message sent by agent",
          details: req.body.content.substring(0, 50) + (req.body.content.length > 50 ? "..." : "")
        });
      }
      
      // Get agent details if applicable
      let agent = undefined;
      if (messageData.isFromAgent && messageData.agentId) {
        agent = await db.query.users.findFirst({
          where: eq(users.id, messageData.agentId)
        });
      }
      
      const messageWithDetails = {
        ...newMessage,
        agent: agent 
          ? { 
              id: agent.id, 
              name: agent.name, 
              username: agent.username,
              role: agent.role,
              avatarUrl: agent.avatarUrl
            } 
          : undefined,
        contact: contact
      };
      
      // Broadcast new message to all connected clients
      console.log("Enviando nova mensagem via WebSocket broadcast:", messageWithDetails);
      broadcastToClients({
        type: "new_message",
        data: messageWithDetails
      });
      
      return res.status(201).json(messageWithDetails);
      
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rota para enviar mídia
  app.post(`${apiPrefix}/conversations/:id/media`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      // Verificar se existe a conversa
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Buscar o canal para verificar se é WhatsApp
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Buscar o contato para obter o número de telefone
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      // Verificar se há um arquivo na requisição
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      const file = req.files.file;
      const mediaType = req.body.mediaType as 'image' | 'file' | 'voice' | 'video';
      
      if (!file || !mediaType) {
        return res.status(400).json({ 
          message: "Dados de mídia inválidos",
          detail: "O arquivo e o tipo de mídia são obrigatórios"
        });
      }
      
      // Gerar URL temporária para o arquivo (em uma implementação real, faria upload para Amazon S3, etc.)
      // Para teste, usaremos uma URL de exemplo
      const mediaUrl = "https://example.com/media/test-image.jpg";
      const fileName = file.name;
      
      let content = '';
      switch(mediaType) {
        case 'image':
          content = 'Imagem enviada';
          break;
        case 'file':
          content = `Documento enviado: ${fileName}`;
          break;
        case 'voice':
          content = 'Áudio enviado';
          break;
        case 'video':
          content = 'Vídeo enviado';
          break;
        default:
          content = 'Mídia enviada';
      }
      
      // Status inicial da mensagem
      let messageStatus = "sent";
      let externalMessageId = null;
      
      // Enviar mídia para o WhatsApp se for canal de WhatsApp
      if (channel.type === "whatsapp") {
        try {
          // Importar serviço WhatsApp
          const whatsAppService = await import("../services/channels/whatsapp");
          
          console.log(`Enviando mídia de tipo ${mediaType} para ${contact.phone}: "${mediaUrl}"`);
          
          // Usar serviço WhatsApp para enviar mídia
          const result = await whatsAppService.sendWhatsAppMessage(
            channel,
            contact.phone,
            content,
            mediaType,
            mediaUrl,
            fileName
          );
          
          if (result.status === "success") {
            messageStatus = "delivered";
            externalMessageId = result.messageId;
            console.log(`Mídia enviada com sucesso, ID: ${result.messageId}`);
          } else {
            console.error(`Erro ao enviar mídia: ${result.message}`);
            messageStatus = "failed";
          }
        } catch (error) {
          console.error("Erro ao enviar mídia:", error);
          messageStatus = "failed";
        }
      }
      
      // Criar mensagem no banco de dados
      const messageData = {
        conversationId,
        content,
        isFromAgent: true,
        agentId: req.session.userId,
        status: messageStatus,
        metadata: {
          mediaType,
          mediaUrl,
          fileName,
          ...(externalMessageId ? { externalMessageId } : {})
        }
      };
      
      const [newMessage] = await db
        .insert(messages)
        .values(messageData)
        .returning();
      
      // Atualizar data da última mensagem na conversa
      await db
        .update(conversations)
        .set({ 
          lastMessageAt: new Date()
        })
        .where(eq(conversations.id, conversationId));
      
      // Buscar detalhes do agente
      const agent = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId)
      });
      
      const messageWithDetails = {
        ...newMessage,
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
      
      // Broadcast nova mensagem para todos os clientes conectados
      broadcastToClients({
        type: "new_message",
        data: messageWithDetails
      });
      
      return res.status(201).json(messageWithDetails);
      
    } catch (error) {
      console.error("Erro ao enviar mídia:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Mark message as read
  app.patch(`${apiPrefix}/conversations/:conversationId/messages/:messageId/read`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messageId = parseInt(req.params.messageId);
      
      const message = await db.query.messages.findFirst({
        where: and(
          eq(messages.id, messageId),
          eq(messages.conversationId, conversationId)
        )
      });
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Obter os dados completos da mensagem e da conversa
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Buscar o canal para verificar se é WhatsApp
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      // Atualizar status da mensagem localmente
      const [updatedMessage] = await db
        .update(messages)
        .set({ status: "read" })
        .where(and(
          eq(messages.id, messageId),
          eq(messages.conversationId, conversationId)
        ))
        .returning();
        
      // Se for um canal Z-API e a mensagem tiver ID externo, marcar como lida na Z-API
      if (channel && 
          channel.type === "whatsapp" && 
          channel.config?.provider === "zapi" && 
          message.metadata && 
          typeof message.metadata === "object" && 
          "externalMessageId" in message.metadata && 
          message.metadata.externalMessageId) {
            
        try {
          // Importar serviço Z-API dinamicamente
          const zapiService = await import("../services/channels/zapi");
          
          // Verificar se a função markMessageAsRead existe no serviço importado
          if (typeof zapiService.markMessageAsRead === "function") {
            // Marcar mensagem como lida na Z-API
            const externalId = String(message.metadata.externalMessageId);
            console.log(`Marcando mensagem ${externalId} como lida na Z-API`);
            
            await zapiService.markMessageAsRead(channel, externalId)
              .catch((error: Error) => {
                console.error("Erro ao marcar como lida na Z-API:", error);
              });
          } else {
            console.warn("Função markMessageAsRead não encontrada no serviço Z-API");
          }
        } catch (error) {
          console.error("Erro ao importar serviço Z-API:", error);
          // Não falhar a requisição se apenas a integração externa falhar
        }
      }
      
      return res.json(updatedMessage);
      
    } catch (error) {
      console.error("Error marking message as read:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Assign conversation to agent
  app.patch(`${apiPrefix}/conversations/:id/assign`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const agentId = req.body.agentId ? parseInt(req.body.agentId) : null;
      
      // Validate agent ID if provided
      if (agentId) {
        const agent = await db.query.users.findFirst({
          where: eq(users.id, agentId)
        });
        
        if (!agent) {
          return res.status(404).json({ message: "Agent not found" });
        }
      }
      
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Update conversation
      const [updatedConversation] = await db
        .update(conversations)
        .set({ assignedTo: agentId })
        .where(eq(conversations.id, conversationId))
        .returning();
      
      return res.json(updatedConversation);
      
    } catch (error) {
      console.error("Error assigning conversation:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update conversation status
  app.patch(`${apiPrefix}/conversations/:id/status`, isAuthenticated, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const status = req.body.status;
      
      // Validate status
      const validStatuses = ["open", "closed", "pending"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status", 
          validValues: validStatuses 
        });
      }
      
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Update conversation
      const [updatedConversation] = await db
        .update(conversations)
        .set({ status })
        .where(eq(conversations.id, conversationId))
        .returning();
      
      return res.json(updatedConversation);
      
    } catch (error) {
      console.error("Error updating conversation status:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
