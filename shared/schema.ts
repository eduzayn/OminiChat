import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Organizations (Tenants) Table
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  schema: text("schema").notNull().unique(),
  active: boolean("active").default(true),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#1E40AF"), // brand color
  planType: text("plan_type").default("basic"), // basic, professional, enterprise
  supportEmail: text("support_email"),
  settings: jsonb("settings"), // JSON with tenant-specific settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: (schema) => schema.min(2, "Nome da organização deve ter no mínimo 2 caracteres"),
  slug: (schema) => schema.min(2, "Slug deve ter no mínimo 2 caracteres"),
  schema: (schema) => schema.min(2, "Schema deve ter no mínimo 2 caracteres"),
  supportEmail: (schema) => schema.email("Email deve ser válido").optional(),
});

// Organization Users (mapping between users and organizations)
export const organizationUsers = pgTable("organization_users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // owner, admin, member
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationUserSchema = createInsertSchema(organizationUsers, {
  role: (schema) => z.enum(["owner", "admin", "member"]),
});

// Opportunities Table
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  stage: text("stage").notNull().default("prospecting"), // prospecting, qualification, proposal, negotiation, closing
  status: text("status").notNull().default("open"), // open, won, lost
  description: text("description"),
  expectedCloseDate: timestamp("expected_close_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunities, {
  title: (schema) => schema.min(2, "Title must be at least 2 characters"),
  value: (schema) => schema.refine(val => Number(val) > 0, "Value must be positive"),
  stage: (schema) => z.enum(["prospecting", "qualification", "proposal", "negotiation", "closing"]),
  status: (schema) => z.enum(["open", "won", "lost"]),
});

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("agent"),
  avatarUrl: text("avatar_url"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(4, "Password must be at least 4 characters"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Email must be valid"),
});

// Contacts Table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  avatarUrl: text("avatar_url"),
  tags: jsonb("tags").default([]),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContactSchema = createInsertSchema(contacts, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Email must be valid").optional().nullable(),
  phone: (schema) => schema.optional().nullable(),
});

// Define configurações de canal
export const channelConfigSchema = z.object({
  provider: z.enum(["zapi", "twilio", "meta"]).optional(),
  instanceId: z.string().optional(),
  token: z.string().optional(),
  phoneNumber: z.string().optional(),
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  accessToken: z.string().optional(),
  instagramAccountId: z.string().optional(),
  pageId: z.string().optional(),
  webhookUrl: z.string().optional(),
  apiUrl: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  appId: z.string().optional(),
}).catchall(z.any());

export type ChannelConfig = z.infer<typeof channelConfigSchema>;

// Channels Table
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // whatsapp, instagram, facebook
  isActive: boolean("is_active").default(true),
  config: jsonb("config").$type<ChannelConfig>().default({}),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChannelSchema = createInsertSchema(channels, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  type: (schema) => z.enum(["whatsapp", "instagram", "facebook", "sms"]),
});

// Conversations Table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  channelId: integer("channel_id").notNull().references(() => channels.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status").notNull().default("open"),
  unreadCount: integer("unread_count").default(0),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations);

// Messages Table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  isFromAgent: boolean("is_from_agent").default(false),
  agentId: integer("agent_id").references(() => users.id),
  contactId: integer("contact_id").references(() => contacts.id),
  status: text("status").default("sent"), // sent, delivered, read
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages, {
  content: (schema) => schema.min(1, "Message content cannot be empty"),
});

// Payments Table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  amount: text("amount").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
  paymentUrl: text("payment_url"),
  externalId: text("external_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments);

// Activities Table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  type: text("type").notNull(), // payment, appointment, conversation, contact_created
  description: text("description").notNull(),
  details: text("details"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activities);

// Notes Table
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notes, {
  content: (schema) => schema.min(1, "Note content cannot be empty"),
});

// Message Templates Table
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates, {
  title: (schema) => schema.min(2, "Title must be at least 2 characters"),
  content: (schema) => schema.min(5, "Template content must be at least 5 characters"),
});

// Define Relations
export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  contact: one(contacts, {
    fields: [opportunities.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [opportunities.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedConversations: many(conversations),
  messages: many(messages),
  notes: many(notes),
  messageTemplates: many(messageTemplates),
  opportunities: many(opportunities),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  conversations: many(conversations),
  messages: many(messages),
  activities: many(activities),
  notes: many(notes),
  payments: many(payments),
  opportunities: many(opportunities),
}));

export const channelsRelations = relations(channels, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  channel: one(channels, {
    fields: [conversations.channelId],
    references: [channels.id],
  }),
  assignedUser: one(users, {
    fields: [conversations.assignedTo],
    references: [users.id],
  }),
  messages: many(messages),
  payments: many(payments),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  agent: one(users, {
    fields: [messages.agentId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [messages.contactId],
    references: [contacts.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  conversation: one(conversations, {
    fields: [payments.conversationId],
    references: [conversations.id],
  }),
  contact: one(contacts, {
    fields: [payments.contactId],
    references: [contacts.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  createdByUser: one(users, {
    fields: [messageTemplates.createdBy],
    references: [users.id],
  }),
}));

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(organizationUsers),
}));

export const organizationUsersRelations = relations(organizationUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationUsers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationUsers.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Channel = typeof channels.$inferSelect & {
  metadata?: {
    webhookUrl?: string;
    webhookReceiveCount?: number;
    lastWebhookReceived?: string;
    lastWebhookSetup?: string;
    [key: string]: any;
  };
};
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export type Conversation = typeof conversations.$inferSelect & {
  contact: Contact;
  channel: Channel;
  assignedUser?: User;
  lastMessage?: Message;
};
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect & {
  agent?: User;
  contact?: Contact;
};
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Note = typeof notes.$inferSelect & {
  user: User;
};
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect & {
  createdByUser?: User;
};
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export type Opportunity = typeof opportunities.$inferSelect & {
  contact: Contact;
  user: User;
};
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type OrganizationUser = typeof organizationUsers.$inferSelect & {
  organization: Organization;
  user: User;
};
export type InsertOrganizationUser = z.infer<typeof insertOrganizationUserSchema>;
