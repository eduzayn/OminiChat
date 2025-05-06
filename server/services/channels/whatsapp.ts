import { Channel } from "@shared/schema";
import axios from "axios";

// Importando serviço Z-API
import * as zapiService from './zapi';

// Function to set up and configure WhatsApp channel
export async function setupChannel(channel: Channel): Promise<{ status: string; message?: string; qrCode?: string }> {
  try {
    // Check channel configuration
    if (!channel.config || !channel.type) {
      return {
        status: "error",
        message: "Invalid channel configuration"
      };
    }

    // Different setup based on WhatsApp provider
    const provider = channel.config.provider as string || "twilio";

    if (provider === "meta") {
      return setupMetaWhatsApp(channel);
    } else if (provider === "twilio") {
      return setupTwilioWhatsApp(channel);
    } else if (provider === "zapi") {
      return zapiService.setupZAPIChannel(channel);
    } else {
      return {
        status: "error",
        message: `Unsupported WhatsApp provider: ${provider}`
      };
    }
  } catch (error) {
    console.error("Error setting up WhatsApp channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up WhatsApp channel"
    };
  }
}

// Setup WhatsApp via Meta API (WhatsApp Business API)
async function setupMetaWhatsApp(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    // Check Meta configuration
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken;
    const phoneNumberId = channel.config.phoneNumberId;
    const businessAccountId = channel.config.businessAccountId;

    if (!accessToken || !phoneNumberId) {
      return {
        status: "error",
        message: "Missing Meta configuration (accessToken, phoneNumberId)"
      };
    }

    // Set up webhook URL
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/meta/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/meta/${channel.id}`;

    // Validate Meta API credentials by making a call
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/${phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.status !== 200) {
        return {
          status: "error",
          message: "Invalid Meta credentials"
        };
      }

      return {
        status: "success",
        message: "Meta WhatsApp Business API configured successfully"
      };
    } catch (error) {
      console.error("Error validating Meta API credentials:", error);
      return {
        status: "error",
        message: "Failed to validate Meta API credentials"
      };
    }
  } catch (error) {
    console.error("Error setting up Meta WhatsApp channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up Meta WhatsApp"
    };
  }
}

// Setup WhatsApp via Twilio
async function setupTwilioWhatsApp(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    // Check Twilio configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID || channel.config.accountSid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || channel.config.authToken;
    const phoneNumber = channel.config.phoneNumber;

    if (!accountSid || !authToken || !phoneNumber) {
      return {
        status: "error",
        message: "Missing Twilio configuration (accountSid, authToken, phoneNumber)"
      };
    }

    // Setup webhook for incoming messages
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/twilio/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/twilio/${channel.id}`;

    // Validate Twilio credentials by making a simple API call
    try {
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          auth: {
            username: accountSid,
            password: authToken
          }
        }
      );

      if (response.status !== 200) {
        return {
          status: "error",
          message: "Invalid Twilio credentials"
        };
      }

      // Configure the WhatsApp number to use our webhook
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumber}.json`,
        `SmsUrl=${webhookUrl}`,
        {
          auth: {
            username: accountSid,
            password: authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        status: "success",
        message: "Twilio WhatsApp channel configured successfully"
      };
    } catch (error) {
      console.error("Error validating Twilio credentials:", error);
      return {
        status: "error",
        message: "Failed to validate Twilio credentials"
      };
    }
  } catch (error) {
    console.error("Error setting up Twilio WhatsApp channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up Twilio WhatsApp"
    };
  }
}

// Setup WhatsApp via Zap (QR Code based)
async function setupZapWhatsApp(channel: Channel): Promise<{ status: string; message?: string; qrCode?: string }> {
  try {
    // For Zap API, we need to generate a QR code for the user to scan
    // This would typically involve calling the Zap API to start a session
    
    // Use environment variables for Zap API credentials
    const zapApiKey = process.env.ZAP_API_KEY || channel.config.apiKey;
    const zapApiUrl = process.env.ZAP_API_URL || channel.config.apiUrl || "https://api.zap.com";
    
    if (!zapApiKey) {
      return {
        status: "error",
        message: "Missing Zap API key"
      };
    }
    
    // Set up webhook for incoming messages
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/zap/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/zap/${channel.id}`;
    
    // Initialize Zap session (this is a placeholder - actual implementation would depend on the Zap API)
    try {
      const response = await axios.post(
        `${zapApiUrl}/sessions/init`,
        {
          webhook: webhookUrl,
          channelId: channel.id
        },
        {
          headers: {
            Authorization: `Bearer ${zapApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.qrCode) {
        return {
          status: "pending",
          message: "Scan the QR code with WhatsApp to connect",
          qrCode: response.data.qrCode
        };
      } else {
        return {
          status: "error",
          message: "Failed to generate QR code"
        };
      }
    } catch (error) {
      console.error("Error initializing Zap session:", error);
      return {
        status: "error",
        message: "Failed to initialize Zap session"
      };
    }
  } catch (error) {
    console.error("Error setting up Zap WhatsApp channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up Zap WhatsApp"
    };
  }
}

// Function to send a WhatsApp message
export async function sendWhatsAppMessage(
  channel: Channel,
  to: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'voice' = 'text',
  mediaUrl?: string,
  fileName?: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const provider = channel.config.provider as string || "twilio";
    
    if (provider === "meta") {
      return sendMetaWhatsAppMessage(channel, to, content, type, mediaUrl);
    } else if (provider === "twilio") {
      return sendTwilioWhatsAppMessage(channel, to, content);
    } else {
      return {
        status: "error",
        message: `Unsupported WhatsApp provider: ${provider}`
      };
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending WhatsApp message"
    };
  }
}

// Send WhatsApp message via Meta API
async function sendMetaWhatsAppMessage(
  channel: Channel,
  to: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'voice' = 'text',
  mediaUrl?: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN || channel.config.accessToken as string;
    const phoneNumberId = channel.config.phoneNumberId as string;
    
    if (!accessToken || !phoneNumberId) {
      return {
        status: "error",
        message: "Missing Meta API configuration"
      };
    }
    
    // Formatar número de telefone se necessário (remover + e caracteres especiais)
    const formattedPhone = to.replace(/\D/g, '');
    
    let requestData: any = {};
    
    // Preparar dados de acordo com o tipo de mensagem
    switch (type) {
      case 'image':
        if (!mediaUrl) {
          return { status: "error", message: "Media URL is required for image messages" };
        }
        requestData = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "image",
          image: {
            link: mediaUrl,
            caption: content || undefined
          }
        };
        break;
        
      case 'file':
        if (!mediaUrl) {
          return { status: "error", message: "Media URL is required for file messages" };
        }
        requestData = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "document",
          document: {
            link: mediaUrl,
            caption: content || undefined
          }
        };
        break;
        
      case 'voice':
        if (!mediaUrl) {
          return { status: "error", message: "Media URL is required for voice messages" };
        }
        requestData = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "audio",
          audio: {
            link: mediaUrl
          }
        };
        break;
        
      case 'text':
      default:
        requestData = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            body: content
          }
        };
        break;
    }
    
    // Enviar mensagem via API da Meta
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.messages && response.data.messages.length > 0) {
      return {
        status: "success",
        messageId: response.data.messages[0].id
      };
    } else {
      return {
        status: "error",
        message: "Failed to send message via Meta API"
      };
    }
  } catch (error) {
    console.error("Error sending Meta WhatsApp message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending Meta WhatsApp message"
    };
  }
}

// Send WhatsApp message via Twilio
async function sendTwilioWhatsAppMessage(
  channel: Channel,
  to: string,
  content: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || channel.config.accountSid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || channel.config.authToken;
    const fromNumber = channel.config.phoneNumber;
    
    if (!accountSid || !authToken || !fromNumber) {
      return {
        status: "error",
        message: "Missing Twilio configuration"
      };
    }
    
    // Format the 'to' number to WhatsApp format if needed
    const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const whatsappFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;
    
    // Send the message
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: whatsappFrom,
        To: whatsappTo,
        Body: content
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );
    
    if (response.data.sid) {
      return {
        status: "success",
        messageId: response.data.sid
      };
    } else {
      return {
        status: "error",
        message: "Failed to send message via Twilio"
      };
    }
  } catch (error) {
    console.error("Error sending Twilio WhatsApp message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending Twilio WhatsApp message"
    };
  }
}

// Send WhatsApp message via Zap
async function sendZapWhatsAppMessage(
  channel: Channel,
  to: string,
  content: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const zapApiKey = process.env.ZAP_API_KEY || channel.config.apiKey;
    const zapApiUrl = process.env.ZAP_API_URL || channel.config.apiUrl || "https://api.zap.com";
    const sessionId = channel.config.sessionId;
    
    if (!zapApiKey || !sessionId) {
      return {
        status: "error",
        message: "Missing Zap API configuration"
      };
    }
    
    // Send the message
    const response = await axios.post(
      `${zapApiUrl}/sessions/${sessionId}/messages`,
      {
        to,
        content
      },
      {
        headers: {
          Authorization: `Bearer ${zapApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.id) {
      return {
        status: "success",
        messageId: response.data.id
      };
    } else {
      return {
        status: "error",
        message: "Failed to send message via Zap API"
      };
    }
  } catch (error) {
    console.error("Error sending Zap WhatsApp message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending Zap WhatsApp message"
    };
  }
}
