import { Express } from "express";
import { db } from "@db";
import { 
  payments, 
  conversations, 
  contacts, 
  activities, 
  messages,
  insertPaymentSchema,
  InsertPayment
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createAsaasPayment, getAsaasPaymentById } from "../services/payments";
import { broadcastToClients } from "../services/socket";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

export function registerPaymentRoutes(app: Express, apiPrefix: string) {
  // Get all payments
  app.get(`${apiPrefix}/payments`, isAuthenticated, async (req, res) => {
    try {
      const allPayments = await db.query.payments.findMany({
        orderBy: (payments, { desc }) => [desc(payments.createdAt)]
      });
      
      return res.json(allPayments);
      
    } catch (error) {
      console.error("Error fetching payments:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get payment by ID
  app.get(`${apiPrefix}/payments/:id`, isAuthenticated, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      
      const payment = await db.query.payments.findFirst({
        where: eq(payments.id, paymentId)
      });
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // If payment has an external ID, check for updates
      if (payment.externalId) {
        const asaasPayment = await getAsaasPaymentById(payment.externalId);
        
        // If payment status changed, update it
        if (asaasPayment && asaasPayment.status !== payment.status) {
          const [updatedPayment] = await db
            .update(payments)
            .set({ 
              status: asaasPayment.status,
              metadata: {
                ...payment.metadata,
                asaasResponse: asaasPayment
              }
            })
            .where(eq(payments.id, paymentId))
            .returning();
          
          return res.json(updatedPayment);
        }
      }
      
      return res.json(payment);
      
    } catch (error) {
      console.error("Error fetching payment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create payment request
  app.post(`${apiPrefix}/payments/request`, isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const paymentRequestSchema = z.object({
        conversationId: z.number(),
        amount: z.number().positive(),
        description: z.string().min(1),
        dueDate: z.string().optional(),
      });
      
      const validation = paymentRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid payment request data", 
          errors: validation.error.errors 
        });
      }
      
      const { conversationId, amount, description, dueDate } = validation.data;
      
      // Get conversation and contact
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, conversation.contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Create payment in Asaas
      const paymentResponse = await createAsaasPayment({
        customer: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
        },
        value: amount,
        description,
        dueDate: dueDate || undefined,
      });
      
      if (!paymentResponse || paymentResponse.error) {
        return res.status(500).json({ 
          message: "Failed to create payment in Asaas", 
          error: paymentResponse?.error 
        });
      }
      
      // Create payment record in our database
      const [newPayment] = await db
        .insert(payments)
        .values({
          conversationId,
          contactId: contact.id,
          amount: amount.toString(),
          description,
          status: paymentResponse.status,
          paymentUrl: paymentResponse.invoiceUrl,
          externalId: paymentResponse.id,
          metadata: {
            asaasResponse: paymentResponse
          }
        })
        .returning();
      
      // Create activity for payment request
      await db.insert(activities).values({
        contactId: contact.id,
        type: "payment",
        description: "Payment Requested",
        details: `R$${amount.toFixed(2)} - ${description}`
      });
      
      // Create a message with the payment request
      const [newMessage] = await db
        .insert(messages)
        .values({
          conversationId,
          content: `Payment request for R$${amount.toFixed(2)}: ${description}`,
          isFromAgent: true,
          agentId: req.session.userId,
          metadata: {
            paymentRequest: {
              paymentId: newPayment.id,
              amount: amount.toString(),
              description,
              paymentUrl: paymentResponse.invoiceUrl
            }
          }
        })
        .returning();
      
      // Update conversation lastMessageAt
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));
      
      // Get agent details
      const agent = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId)
      });
      
      // Broadcast the message to all connected clients
      broadcastToClients({
        type: "new_message",
        message: {
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
        }
      });
      
      return res.status(201).json({
        payment: newPayment,
        message: newMessage
      });
      
    } catch (error) {
      console.error("Error creating payment request:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create invoice
  app.post(`${apiPrefix}/payments/invoice`, isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const invoiceSchema = z.object({
        contactId: z.number(),
        amount: z.number().positive(),
        description: z.string().min(1),
        dueDate: z.string().optional(),
      });
      
      const validation = invoiceSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: validation.error.errors 
        });
      }
      
      const { contactId, amount, description, dueDate } = validation.data;
      
      // Get contact
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Create payment in Asaas
      const paymentResponse = await createAsaasPayment({
        customer: {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
        },
        value: amount,
        description,
        dueDate: dueDate || undefined,
      });
      
      if (!paymentResponse || paymentResponse.error) {
        return res.status(500).json({ 
          message: "Failed to create invoice in Asaas", 
          error: paymentResponse?.error 
        });
      }
      
      // Find or create a conversation for the contact
      let conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.contactId, contactId),
          eq(conversations.status, "open")
        )
      });
      
      if (!conversation) {
        // Get default channel
        const defaultChannel = await db.query.channels.findFirst({
          where: eq(channels.type, "whatsapp")
        });
        
        if (!defaultChannel) {
          return res.status(500).json({ message: "No default channel found" });
        }
        
        // Create a new conversation
        const [newConversation] = await db
          .insert(conversations)
          .values({
            contactId,
            channelId: defaultChannel.id,
            assignedTo: req.session.userId
          })
          .returning();
          
        conversation = newConversation;
      }
      
      // Create payment record in our database
      const [newPayment] = await db
        .insert(payments)
        .values({
          conversationId: conversation.id,
          contactId,
          amount: amount.toString(),
          description,
          status: paymentResponse.status,
          paymentUrl: paymentResponse.invoiceUrl,
          externalId: paymentResponse.id,
          metadata: {
            asaasResponse: paymentResponse
          }
        })
        .returning();
      
      // Create activity for invoice
      await db.insert(activities).values({
        contactId,
        type: "payment",
        description: "Invoice Sent",
        details: `R$${amount.toFixed(2)} - ${description}`
      });
      
      // If an active conversation exists, create a message
      if (conversation) {
        const [newMessage] = await db
          .insert(messages)
          .values({
            conversationId: conversation.id,
            content: `Invoice sent for R$${amount.toFixed(2)}: ${description}`,
            isFromAgent: true,
            agentId: req.session.userId,
            metadata: {
              paymentRequest: {
                paymentId: newPayment.id,
                amount: amount.toString(),
                description,
                paymentUrl: paymentResponse.invoiceUrl
              }
            }
          })
          .returning();
        
        // Update conversation lastMessageAt
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversation.id));
        
        // Get agent details
        const agent = await db.query.users.findFirst({
          where: eq(users.id, req.session.userId)
        });
        
        // Broadcast the message to all connected clients
        broadcastToClients({
          type: "new_message",
          message: {
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
          }
        });
      }
      
      return res.status(201).json({
        payment: newPayment
      });
      
    } catch (error) {
      console.error("Error creating invoice:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Handle payment webhook
  app.post(`${apiPrefix}/payments/webhook`, async (req, res) => {
    try {
      // Validate webhook data
      const webhookSchema = z.object({
        event: z.string(),
        payment: z.object({
          id: z.string(),
          status: z.string()
        })
      });
      
      const validation = webhookSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid webhook data", 
          errors: validation.error.errors 
        });
      }
      
      const { event, payment } = validation.data;
      
      // Find the payment in our database
      const ourPayment = await db.query.payments.findFirst({
        where: eq(payments.externalId, payment.id)
      });
      
      if (!ourPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Update payment status
      const [updatedPayment] = await db
        .update(payments)
        .set({ 
          status: payment.status,
          metadata: {
            ...ourPayment.metadata,
            webhookEvent: event,
            webhookData: req.body
          }
        })
        .where(eq(payments.externalId, payment.id))
        .returning();
      
      // Create activity for payment status update
      await db.insert(activities).values({
        contactId: ourPayment.contactId,
        type: "payment",
        description: `Payment ${payment.status}`,
        details: `Payment of R$${ourPayment.amount} has been ${payment.status}`
      });
      
      // Find conversation
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, ourPayment.conversationId)
      });
      
      if (conversation) {
        // Create a message to notify about payment status
        const [newMessage] = await db
          .insert(messages)
          .values({
            conversationId: conversation.id,
            content: `Payment for R$${ourPayment.amount} has been ${payment.status}`,
            isFromAgent: false,
            contactId: ourPayment.contactId,
            metadata: {
              paymentUpdate: {
                paymentId: ourPayment.id,
                status: payment.status
              }
            }
          })
          .returning();
        
        // Update conversation lastMessageAt
        await db
          .update(conversations)
          .set({ 
            lastMessageAt: new Date(),
            unreadCount: sql`${conversations.unreadCount} + 1`
          })
          .where(eq(conversations.id, conversation.id));
        
        // Get contact details
        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, ourPayment.contactId)
        });
        
        // Broadcast the message to all connected clients
        broadcastToClients({
          type: "new_message",
          message: {
            ...newMessage,
            contact
          }
        });
      }
      
      return res.status(200).json({ success: true });
      
    } catch (error) {
      console.error("Error processing payment webhook:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
