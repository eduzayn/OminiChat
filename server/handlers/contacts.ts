import { Express } from "express";
import { db } from "@db";
import { 
  contacts, 
  conversations, 
  messages, 
  activities, 
  payments, 
  notes,
  insertContactSchema,
  users,
  InsertContact
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
}

export function registerContactRoutes(app: Express, apiPrefix: string) {
  // Get all contacts
  app.get(`${apiPrefix}/contacts`, isAuthenticated, async (req, res) => {
    try {
      const allContacts = await db.query.contacts.findMany({
        orderBy: [desc(contacts.createdAt)]
      });
      
      return res.json(allContacts);
      
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get contact by ID
  app.get(`${apiPrefix}/contacts/:id`, isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      return res.json(contact);
      
    } catch (error) {
      console.error("Error fetching contact:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create a new contact
  app.post(`${apiPrefix}/contacts`, isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const validation = insertContactSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid contact data", 
          errors: validation.error.errors 
        });
      }
      
      // Check if contact with same email or phone already exists
      if (req.body.email) {
        const existingContactByEmail = await db.query.contacts.findFirst({
          where: eq(contacts.email, req.body.email)
        });
        
        if (existingContactByEmail) {
          return res.status(409).json({ 
            message: "Contact with this email already exists",
            existingContact: existingContactByEmail
          });
        }
      }
      
      if (req.body.phone) {
        const existingContactByPhone = await db.query.contacts.findFirst({
          where: eq(contacts.phone, req.body.phone)
        });
        
        if (existingContactByPhone) {
          return res.status(409).json({ 
            message: "Contact with this phone number already exists",
            existingContact: existingContactByPhone
          });
        }
      }
      
      // Prepare contact data
      const contactData: InsertContact = {
        name: req.body.name,
        email: req.body.email || null,
        phone: req.body.phone || null,
        location: req.body.location || null,
        avatarUrl: req.body.avatarUrl || null,
        tags: req.body.tags || [],
      };
      
      // Insert contact
      const [newContact] = await db
        .insert(contacts)
        .values(contactData)
        .returning();
      
      // Create activity for contact creation
      await db.insert(activities).values({
        contactId: newContact.id,
        type: "contact_created",
        description: "Contact Created",
        details: `Contact created by ${req.session.username || 'system'}`
      });
      
      return res.status(201).json(newContact);
      
    } catch (error) {
      console.error("Error creating contact:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update a contact
  app.patch(`${apiPrefix}/contacts/:id`, isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Prepare update data
      const updateData: Partial<InsertContact> = {};
      
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.location !== undefined) updateData.location = req.body.location;
      if (req.body.avatarUrl !== undefined) updateData.avatarUrl = req.body.avatarUrl;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags;
      
      // Update contact
      const [updatedContact] = await db
        .update(contacts)
        .set({ 
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(contacts.id, contactId))
        .returning();
      
      return res.json(updatedContact);
      
    } catch (error) {
      console.error("Error updating contact:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get contact activities
  app.get(`${apiPrefix}/contacts/:id/activities`, isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Get activities
      const allActivities = await db.query.activities.findMany({
        where: eq(activities.contactId, contactId),
        orderBy: [desc(activities.createdAt)]
      });
      
      // Get payments
      const allPayments = await db.query.payments.findMany({
        where: eq(payments.contactId, contactId),
        orderBy: [desc(payments.createdAt)]
      });
      
      // Get notes
      const allNotes = await db.query.notes.findMany({
        where: eq(notes.contactId, contactId),
        orderBy: [desc(notes.createdAt)]
      });
      
      // Get conversations
      const allConversations = await db.query.conversations.findMany({
        where: eq(conversations.contactId, contactId),
        orderBy: [desc(conversations.createdAt)]
      });
      
      // Combine all activities into one list
      const combinedActivities = [
        ...allActivities.map(activity => ({
          id: `activity-${activity.id}`,
          type: activity.type,
          description: activity.description,
          details: activity.details || undefined,
          timestamp: activity.createdAt.toISOString(),
          metadata: activity.metadata
        })),
        ...allPayments.map(payment => ({
          id: `payment-${payment.id}`,
          type: "payment",
          description: "Payment " + payment.status,
          details: `${payment.description} - R$${payment.amount}`,
          timestamp: payment.createdAt.toISOString(),
          metadata: payment.metadata
        })),
        ...allNotes.map(async note => {
          // Get user who created the note
          const user = await db.query.users.findFirst({
            where: eq(users.id, note.userId)
          });
          
          return {
            id: `note-${note.id}`,
            type: "note",
            description: "Note Added",
            details: note.content,
            timestamp: note.createdAt.toISOString(),
            metadata: { user: user?.name || "Unknown" }
          };
        }),
        ...allConversations.map(conversation => ({
          id: `conversation-${conversation.id}`,
          type: "conversation",
          description: "Conversation Started",
          details: `Via ${conversation.channelId}`,
          timestamp: conversation.createdAt.toISOString(),
          metadata: {}
        }))
      ];
      
      // Resolve any promises in the combined activities
      const resolvedActivities = await Promise.all(
        combinedActivities.map(async (activity) => {
          if (activity instanceof Promise) {
            return await activity;
          }
          return activity;
        })
      );
      
      // Sort by timestamp
      const sortedActivities = resolvedActivities.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      return res.json(sortedActivities);
      
    } catch (error) {
      console.error("Error fetching contact activities:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Add a note to a contact
  app.post(`${apiPrefix}/contacts/:id/notes`, isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Validate request body
      const noteSchema = z.object({
        content: z.string().min(1, "Note content cannot be empty")
      });
      
      const validation = noteSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid note data", 
          errors: validation.error.errors 
        });
      }
      
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
      });
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // Insert note
      const [newNote] = await db
        .insert(notes)
        .values({
          contactId,
          userId: req.session.userId,
          content: req.body.content
        })
        .returning();
      
      // Create activity for note
      await db.insert(activities).values({
        contactId,
        type: "note",
        description: "Note Added",
        details: req.body.content
      });
      
      return res.status(201).json(newNote);
      
    } catch (error) {
      console.error("Error adding note:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
