import { type Express, type Request, type Response } from "express";
import { eq, and, desc, SQL, asc, sql } from "drizzle-orm";
import { db } from "@db";
import {
  conversations,
  messages,
  contacts,
  users,
  channels,
  type Message,
  notes,
  activities
} from "@shared/schema";
// Função broadcastToClients é definida como global
declare global {
  var broadcastToClients: (data: any) => void;
}

// Middleware de autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

/**
 * Registra rotas relacionadas a conversas
 * @param app Aplicação Express
 * @param apiPrefix Prefixo da API
 */
export function registerConversationRoutes(app: Express, apiPrefix: string) {
  // Listar conversas
  app.get(`${apiPrefix}/conversations`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Parâmetros de consulta para filtragem e paginação
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const status = req.query.status as string | undefined;
      const channelId = req.query.channelId ? Number(req.query.channelId) : undefined;
      const query = req.query.query as string | undefined;
      const assignedTo = req.query.assignedTo ? Number(req.query.assignedTo) : undefined;
      
      // Construir a consulta base
      let queryBuilder = db.select({
        id: conversations.id,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        channelId: conversations.channelId,
        contactId: conversations.contactId,
        assignedTo: conversations.assignedTo,
        unreadCount: conversations.unreadCount,
        metadata: conversations.metadata
      })
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));
      
      // Aplicar filtros se fornecidos
      const whereConditions: SQL[] = [];
      
      if (status) {
        whereConditions.push(eq(conversations.status, status));
      }
      
      if (channelId) {
        whereConditions.push(eq(conversations.channelId, channelId));
      }
      
      if (assignedTo !== undefined) {
        if (assignedTo === 0) {
          // Conversas não atribuídas
          whereConditions.push(sql`${conversations.assignedTo} IS NULL`);
        } else {
          // Conversas atribuídas a um agente específico
          whereConditions.push(eq(conversations.assignedTo, assignedTo));
        }
      }
      
      // Aplicar os filtros à consulta
      if (whereConditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...whereConditions));
      }
      
      // Adicionar paginação
      const offset = (page - 1) * limit;
      queryBuilder = queryBuilder.limit(limit).offset(offset);
      
      const conversationsResult = await queryBuilder;
      
      // Buscar detalhes relacionados (contato, canal, última mensagem)
      const conversationsWithDetails = await Promise.all(
        conversationsResult.map(async (conversation) => {
          // Buscar contato
          const contact = await db.query.contacts.findFirst({
            where: eq(contacts.id, conversation.contactId)
          });
          
          // Buscar canal
          const channel = await db.query.channels.findFirst({
            where: eq(channels.id, conversation.channelId)
          });
          
          // Buscar última mensagem
          const lastMessage = await db.query.messages.findFirst({
            where: eq(messages.conversationId, conversation.id),
            orderBy: desc(messages.createdAt),
            limit: 1
          });
          
          // Buscar agente atribuído
          let assignedUser = null;
          if (conversation.assignedTo) {
            assignedUser = await db.query.users.findFirst({
              where: eq(users.id, conversation.assignedTo)
            });
          }
          
          return {
            ...conversation,
            contact,
            channel,
            lastMessage,
            assignedUser
          };
        })
      );
      
      // Contar total para paginação
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(conversations);
        
      const totalCount = Number(countResult[0].count);
      const totalPages = Math.ceil(totalCount / limit);
      
      return res.json({
        data: conversationsWithDetails,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages
        }
      });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Obter uma conversa específica
  app.get(`${apiPrefix}/conversations/:id`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Buscar contato relacionado
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
      });
      
      // Buscar canal relacionado
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      // Buscar última mensagem
      const lastMessage = await db.query.messages.findFirst({
        where: eq(messages.conversationId, conversationId),
        orderBy: desc(messages.createdAt),
        limit: 1
      });
      
      // Buscar usuário atribuído
      let assignedUser = null;
      if (conversation.assignedTo) {
        assignedUser = await db.query.users.findFirst({
          where: eq(users.id, conversation.assignedTo)
        });
      }
      
      // Se não houver contagem de não lidas, definir como 0
      const unreadCount = conversation.unreadCount ?? 0;
      
      // Verificar se é o primeiro acesso do agente à conversa (para auto-atribuição)
      const isFirstAgentAccess = !conversation.assignedTo && unreadCount > 0;
      
      return res.json({
        ...conversation,
        contact,
        channel,
        lastMessage,
        assignedUser,
        unreadCount,
        isFirstAgentAccess
      });
      
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Obter as mensagens de uma conversa
  app.get(`${apiPrefix}/conversations/:id/messages`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      
      // Verificar se a conversa existe
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Buscar canal para acessar configurações
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      // Buscar mensagens da conversa
      const messagesResult = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: asc(messages.createdAt),
        limit,
        offset: (page - 1) * limit
      });
      
      // Buscar detalhes adicionais (agente, contato) para cada mensagem
      const messagesWithDetails = await Promise.all(
        messagesResult.map(async (message) => {
          let agent = undefined;
          if (message.agentId) {
            agent = await db.query.users.findFirst({
              where: eq(users.id, message.agentId)
            });
            
            // Simplificar o objeto do agente para não expor dados sensíveis
            if (agent) {
              agent = {
                id: agent.id,
                name: agent.name,
                username: agent.username,
                role: agent.role,
                avatarUrl: agent.avatarUrl
              };
            }
          }
          
          let contact = undefined;
          if (conversation.contactId) {
            contact = await db.query.contacts.findFirst({
              where: eq(contacts.id, conversation.contactId)
            });
          }
          
          return {
            ...message,
            agent,
            contact
          };
        })
      );
      
      // Marcar conversa como lida se foi acessada pelo agente
      if (conversation.unreadCount) {
        await db
          .update(conversations)
          .set({ 
            unreadCount: 0,
            // Se não há agente atribuído e está sendo visualizada, atribuir automaticamente
            ...(conversation.assignedTo ? {} : { assignedTo: req.session.userId })
          })
          .where(eq(conversations.id, conversationId));
          
        // Notificar outros clientes sobre a atualização da conversa
        broadcastToClients({
          type: "conversation_updated",
          data: {
            conversationId,
            unreadCount: 0,
            assignedTo: conversation.assignedTo || req.session.userId,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      return res.json(messagesWithDetails);
      
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Enviar uma nova mensagem de texto
  app.post(`${apiPrefix}/conversations/:id/messages`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      
      // Verificar se a conversa existe
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Buscar o canal
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      
      // Buscar o contato
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Status inicial da mensagem
      let messageStatus = "sent";
      let externalMessageId = null;
      
      // Enviar mensagem para o WhatsApp se for canal de WhatsApp
      if (channel.type === "whatsapp") {
        try {
          // Importar serviço WhatsApp
          const whatsAppService = await import("../services/channels/whatsapp");
          
          // Enviar mensagem via API do WhatsApp
          const result = await whatsAppService.sendWhatsAppMessage(
            channel,
            contact.phone,
            content
          );
          
          if (result.status === "success") {
            messageStatus = "delivered";
            externalMessageId = result.messageId;
          } else {
            console.error(`Error sending WhatsApp message: ${result.message}`);
            messageStatus = "failed";
          }
        } catch (error) {
          console.error("Error sending WhatsApp message:", error);
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
        metadata: externalMessageId ? { externalMessageId } : undefined
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
      console.error("Error sending message:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Enviar uma mídia (imagem, documento, áudio ou vídeo)
  app.post(`${apiPrefix}/conversations/:id/media`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      // Verificar se a conversa existe
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Buscar o canal
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ message: "Canal não encontrado" });
      }
      
      // Buscar o contato
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
      
      // Tipagem para o express-fileupload
      const fileUpload = req.files.file as import('express-fileupload').UploadedFile;
      const mediaType = req.body.mediaType as 'image' | 'file' | 'voice' | 'video';
      
      if (!fileUpload || !mediaType) {
        return res.status(400).json({ 
          message: "Dados de mídia inválidos",
          detail: "O arquivo e o tipo de mídia são obrigatórios"
        });
      }
      
      // Salvar o arquivo em um local temporário para poder enviá-lo
      const uploadDir = './uploads';
      const fileName = fileUpload.name;
      let filePath = `${uploadDir}/${Date.now()}-${fileName}`;
      
      // Criar diretório uploads se não existir
      if (!require('fs').existsSync(uploadDir)) {
        require('fs').mkdirSync(uploadDir, { recursive: true });
      }
      
      // Mover o arquivo para o diretório de uploads
      await fileUpload.mv(filePath);
      
      console.log(`Arquivo salvo em ${filePath}, tamanho: ${fileUpload.size} bytes`);
      
      // Para o Z-API, precisamos converter o arquivo para base64
      const fileBuffer = require('fs').readFileSync(filePath);
      const base64File = `data:${fileUpload.mimetype};base64,${fileBuffer.toString('base64')}`;
      
      // A Z-API aceita tanto URLs quanto base64 para envio de mídia
      const mediaUrl = base64File;
      
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