import { db } from "./index";
import * as schema from "@shared/schema";
import { hashSync } from "bcrypt";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Seed users
    const existingUsers = await db.query.users.findMany();
    
    if (existingUsers.length === 0) {
      console.log("Creating users...");
      
      await db.insert(schema.users).values([
        {
          username: "admin",
          password: hashSync("admin", 10),
          name: "Admin User",
          email: "admin@omniconnect.com",
          role: "admin",
          avatarUrl: "https://randomuser.me/api/portraits/women/42.jpg"
        },
        {
          username: "agent",
          password: hashSync("agent", 10),
          name: "Maria Santos",
          email: "maria@omniconnect.com",
          role: "agent",
          avatarUrl: "https://randomuser.me/api/portraits/women/23.jpg"
        },
        {
          username: "agent2",
          password: hashSync("agent2", 10),
          name: "Carlos Oliveira",
          email: "carlos@omniconnect.com",
          role: "agent",
          avatarUrl: "https://randomuser.me/api/portraits/men/45.jpg"
        }
      ]);
      
      console.log("✅ Users created");
    } else {
      console.log("⏩ Users already exist, skipping creation");
    }

    // Seed channels
    const existingChannels = await db.query.channels.findMany();
    
    if (existingChannels.length === 0) {
      console.log("Creating channels...");
      
      await db.insert(schema.channels).values([
        {
          name: "WhatsApp Business",
          type: "whatsapp",
          isActive: true,
          config: {
            provider: "twilio",
            phoneNumber: "+5511987654321",
            accountSid: process.env.TWILIO_ACCOUNT_SID || "AC123456",
            authToken: process.env.TWILIO_AUTH_TOKEN || "abc123"
          }
        },
        {
          name: "Instagram Direct",
          type: "instagram",
          isActive: true,
          config: {
            accessToken: process.env.META_ACCESS_TOKEN || "IGQVJXcXh6dXRoaGR2UXpwMjdF...",
            instagramAccountId: "12345678901"
          }
        },
        {
          name: "Facebook Messenger",
          type: "facebook",
          isActive: true,
          config: {
            accessToken: process.env.META_ACCESS_TOKEN || "EAAYxRTZAd4P4BAJ...",
            pageId: "12345678901"
          }
        }
      ]);
      
      console.log("✅ Channels created");
    } else {
      console.log("⏩ Channels already exist, skipping creation");
    }

    // Seed contacts
    const existingContacts = await db.query.contacts.findMany();
    
    if (existingContacts.length === 0) {
      console.log("Creating contacts...");
      
      await db.insert(schema.contacts).values([
        {
          name: "João Silva",
          email: "joao.silva@email.com",
          phone: "+5511987654321",
          location: "São Paulo, Brazil",
          avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
          tags: ["New Customer", "Consultation", "Premium"],
          isOnline: true,
          lastSeen: new Date()
        },
        {
          name: "Ana Martins",
          email: "ana.martins@email.com",
          phone: "+5511976543210",
          location: "Rio de Janeiro, Brazil",
          avatarUrl: "https://randomuser.me/api/portraits/women/55.jpg",
          tags: ["Regular", "Premium"],
          isOnline: false,
          lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          name: "Carlos Oliveira",
          email: "carlos.oliveira@email.com",
          phone: "+5511965432109",
          location: "Belo Horizonte, Brazil",
          avatarUrl: "https://randomuser.me/api/portraits/men/67.jpg",
          tags: ["New Customer"],
          isOnline: false,
          lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          name: "Teresa Almeida",
          email: "teresa.almeida@email.com",
          phone: "+5511954321098",
          location: "Salvador, Brazil",
          avatarUrl: "https://randomuser.me/api/portraits/women/30.jpg",
          tags: ["Premium", "Support"],
          isOnline: false,
          lastSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          name: "Ricardo Pereira",
          email: "ricardo.pereira@email.com",
          phone: "+5511943210987",
          location: "Curitiba, Brazil",
          avatarUrl: "https://randomuser.me/api/portraits/men/18.jpg",
          tags: ["Regular"],
          isOnline: false,
          lastSeen: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
        }
      ]);
      
      console.log("✅ Contacts created");
    } else {
      console.log("⏩ Contacts already exist, skipping creation");
    }

    // Create conversations and messages
    const channels = await db.query.channels.findMany();
    const contacts = await db.query.contacts.findMany();
    const users = await db.query.users.findMany();
    
    if (channels.length > 0 && contacts.length > 0 && users.length > 0) {
      const existingConversations = await db.query.conversations.findMany();
      
      if (existingConversations.length === 0) {
        console.log("Creating conversations and messages...");
        
        // Create a conversation for each contact
        for (let i = 0; i < contacts.length; i++) {
          const contact = contacts[i];
          const channel = channels[i % channels.length]; // Rotate through channels
          const agent = i === 0 ? null : users[i % users.length]; // First convo unassigned, others assigned
          
          // Create conversation
          const [conversation] = await db.insert(schema.conversations)
            .values({
              contactId: contact.id,
              channelId: channel.id,
              assignedTo: agent?.id,
              status: i === 0 ? "open" : (i === 1 ? "open" : "closed"),
              unreadCount: i === 0 ? 1 : 0,
              lastMessageAt: new Date(Date.now() - i * 60 * 60 * 1000) // Staggered times
            })
            .returning();
          
          // Create messages for this conversation
          if (conversation) {
            // Add initial message from contact
            const [initialMessage] = await db.insert(schema.messages)
              .values({
                conversationId: conversation.id,
                content: getInitialMessage(channel.type),
                isFromAgent: false,
                contactId: contact.id,
                status: "read",
                createdAt: new Date(Date.now() - (i * 60 * 60 * 1000) - (30 * 60 * 1000))
              })
              .returning();
            
            // If conversation has agent, add agent response
            if (agent) {
              await db.insert(schema.messages)
                .values({
                  conversationId: conversation.id,
                  content: getAgentResponse(channel.type),
                  isFromAgent: true,
                  agentId: agent.id,
                  status: "read",
                  createdAt: new Date(Date.now() - (i * 60 * 60 * 1000) - (15 * 60 * 1000))
                });
              
              // Add follow-up message from contact
              await db.insert(schema.messages)
                .values({
                  conversationId: conversation.id,
                  content: getFollowUpMessage(channel.type),
                  isFromAgent: false,
                  contactId: contact.id,
                  status: i === 0 ? "delivered" : "read",
                  createdAt: new Date(Date.now() - (i * 60 * 60 * 1000) - (5 * 60 * 1000))
                });
              
              // For the first conversation (João Silva), add payment message
              if (i === 0) {
                // Create payment
                const [payment] = await db.insert(schema.payments)
                  .values({
                    conversationId: conversation.id,
                    contactId: contact.id,
                    amount: "150.00",
                    description: "Initial Consultation - Tuesday at 2pm",
                    status: "pending",
                    paymentUrl: "https://pay.asaas.com/123456",
                    externalId: "pay_123456",
                    metadata: {
                      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    }
                  })
                  .returning();
                
                // Add payment request message from agent
                await db.insert(schema.messages)
                  .values({
                    conversationId: conversation.id,
                    content: "Great! The initial consultation is R$150. I can send you a payment link to secure your spot.",
                    isFromAgent: true,
                    agentId: agent.id,
                    status: "read",
                    metadata: {
                      paymentRequest: {
                        paymentId: payment.id,
                        amount: "150.00",
                        description: "Initial Consultation - Tuesday at 2pm",
                        paymentUrl: "https://pay.asaas.com/123456"
                      }
                    },
                    createdAt: new Date(Date.now() - (60 * 1000))
                  });
                
                // Add last message from client
                await db.insert(schema.messages)
                  .values({
                    conversationId: conversation.id,
                    content: "Thanks! I'll pay for it right now.",
                    isFromAgent: false,
                    contactId: contact.id,
                    status: "delivered",
                    createdAt: new Date()
                  });
              }
            }
          }
        }
        
        console.log("✅ Conversations and messages created");
        
        // Create activities for contacts
        console.log("Creating activities...");
        
        for (const contact of contacts) {
          // Create contact created activity
          await db.insert(schema.activities)
            .values({
              contactId: contact.id,
              type: "contact_created",
              description: "Contact Created",
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            });
          
          // Create conversation started activity
          await db.insert(schema.activities)
            .values({
              contactId: contact.id,
              type: "conversation",
              description: "Conversation Started",
              details: `Via ${channels[contact.id % channels.length].type}`,
              createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            });
          
          // For the first contact (João Silva), create payment and appointment activities
          if (contact.id === 1) {
            await db.insert(schema.activities)
              .values([
                {
                  contactId: contact.id,
                  type: "appointment",
                  description: "Appointment Scheduled",
                  details: "Tuesday, June 20 at 2:00 PM",
                  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
                },
                {
                  contactId: contact.id,
                  type: "payment",
                  description: "Payment Made",
                  details: "Paid R$150,00 for Initial Consultation",
                  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
                }
              ]);
          }
        }
        
        console.log("✅ Activities created");
      } else {
        console.log("⏩ Conversations already exist, skipping creation");
      }
    }
    
    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

// Helper functions to generate realistic messages based on channel type
function getInitialMessage(channelType: string): string {
  switch (channelType) {
    case "whatsapp":
      return "Hello! I'd like to know more about your services. Do you offer consultations?";
    case "instagram":
      return "Hi there! I saw your profile and I'm interested in your products. Can you tell me more?";
    case "facebook":
      return "Hello! I have a question about your services. Do you have a pricelist?";
    default:
      return "Hello! I'd like to know more about your company.";
  }
}

function getAgentResponse(channelType: string): string {
  switch (channelType) {
    case "whatsapp":
      return "Hi! Thanks for reaching out. Yes, we do offer consultations. Would you like to schedule one?";
    case "instagram":
      return "Hello! Thank you for your interest. We have a wide range of products. What are you looking for specifically?";
    case "facebook":
      return "Hello! Thank you for contacting us. I'd be happy to share our pricelist. What services are you interested in?";
    default:
      return "Hi! Thanks for reaching out. How can I help you today?";
  }
}

function getFollowUpMessage(channelType: string): string {
  switch (channelType) {
    case "whatsapp":
      return "That would be great! What are your available times for next week?";
    case "instagram":
      return "I'm looking for the latest summer collection. Do you have that in stock?";
    case "facebook":
      return "I'm interested in your premium package. What does it include?";
    default:
      return "Thank you for the quick response! I have a few more questions.";
  }
}

seed();
