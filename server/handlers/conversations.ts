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
      const [newMessage] = await db
        .insert(messages)
        .values(messageData)
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
      
      // Get contact details
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
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
        contact: contact!
      };
      
      // Broadcast new message to all connected clients
      broadcastToClients({
        type: "new_message",
        message: messageWithDetails
      });
      
      return res.status(201).json(messageWithDetails);
      
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ message: "Internal server error" });
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
      
      // Update message status
      const [updatedMessage] = await db
        .update(messages)
        .set({ status: "read" })
        .where(and(
          eq(messages.id, messageId),
          eq(messages.conversationId, conversationId)
        ))
        .returning();
        
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
