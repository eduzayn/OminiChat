import { Channel } from "@shared/schema";
import axios from "axios";

// Function to set up and configure WhatsApp channel
export async function setupChannel(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    // Check channel configuration
    if (!channel.config || !channel.type) {
      return {
        status: "error",
        message: "Invalid channel configuration"
      };
    }

    // Different setup based on WhatsApp provider
    const config = channel.config as Record<string, any>;
    const provider = config.provider || "twilio";

    console.log(`Configurando canal WhatsApp (ID: ${channel.id}) com provedor: ${provider}`);

    if (provider === "twilio") {
      return setupTwilioWhatsApp(channel);
    } else if (provider === "zap") {
      return setupZapWhatsApp(channel);
    } else {
      return {
        status: "error",
        message: `Provedor WhatsApp não suportado: ${provider}`
      };
    }
  } catch (error) {
    console.error("Erro ao configurar canal WhatsApp:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao configurar canal WhatsApp"
    };
  }
}

// Setup WhatsApp via Twilio
async function setupTwilioWhatsApp(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    // Verificar variáveis de ambiente
    console.log("Verificando credenciais do Twilio...");
    console.log(`TWILIO_ACCOUNT_SID está definido: ${Boolean(process.env.TWILIO_ACCOUNT_SID)}`);
    console.log(`TWILIO_AUTH_TOKEN está definido: ${Boolean(process.env.TWILIO_AUTH_TOKEN)}`);
    console.log(`TWILIO_PHONE_NUMBER está definido: ${Boolean(process.env.TWILIO_PHONE_NUMBER)}`);
    console.log(`TWILIO_API_KEY está definido: ${Boolean(process.env.TWILIO_API_KEY)}`);
    console.log(`TWILIO_API_KEY está definido: ${Boolean(process.env.TWILIO_API_KEY)}`);
    
    // Check Twilio configuration - prefer environment variables over channel config
    const config = channel.config as Record<string, any>;
    const accountSid = process.env.TWILIO_ACCOUNT_SID || config.accountSid;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER || config.phoneNumber;
    const apiKey = process.env.TWILIO_API_KEY || config.apiKey;
    const authToken = process.env.TWILIO_AUTH_TOKEN || config.authToken;

    // Precisamos de Account SID, número de telefone, e algum método de autenticação
    if (!accountSid || !phoneNumber) {
      return {
        status: "error",
        message: "Configuração do Twilio incompleta: SID da conta e número de telefone são obrigatórios"
      };
    }
    
    // Verificar se temos credenciais de autenticação (API Key ou Auth Token)
    if (!apiKey && !authToken) {
      return {
        status: "error",
        message: "Configuração do Twilio incompleta: necessária API Key ou Auth Token"
      };
    }

    // Setup webhook for incoming messages
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/twilio/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/twilio/${channel.id}`;

    // Validate Twilio credentials by making a simple API call
    try {
      // Usar API Key se estiver disponível, caso contrário usar accountSid + authToken
      let authConfig;
      if (apiKey) {
        console.log("Usando API Key para autenticação com Twilio");
        authConfig = {
          username: apiKey,
          password: authToken
        };
      } else {
        console.log("Usando Account SID e Auth Token para autenticação com Twilio");
        authConfig = {
          username: accountSid,
          password: authToken
        };
      }

      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        { auth: authConfig }
      );

      if (response.status !== 200) {
        return {
          status: "error",
          message: "Credenciais Twilio inválidas"
        };
      }

      // Configure webhook for WhatsApp messages via Twilio API
      console.log(`Configurando webhook para Twilio WhatsApp: ${webhookUrl}`);
      
      // Para o WhatsApp Business API através do Twilio, configuramos o webhook na Twilio Console
      // Em vez de modificar o número diretamente, vamos verificar a conectividade
      const sandboxInfoResponse = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messaging/Services.json`,
        { auth: authConfig }
      );
      
      console.log(`Twilio messaging services retrieved: ${sandboxInfoResponse.data.meta.page_size} services found`);
      
      // No mundo real, instrua o usuário a configurar o webhook na Twilio Console manualmente
      // ou utilize a API de Messaging Services para configurar o webhook

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
  content: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const provider = channel.config.provider as string || "twilio";
    
    if (provider === "twilio") {
      return sendTwilioWhatsAppMessage(channel, to, content);
    } else if (provider === "zap") {
      return sendZapWhatsAppMessage(channel, to, content);
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

// Send WhatsApp message via Twilio
async function sendTwilioWhatsAppMessage(
  channel: Channel,
  to: string,
  content: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const config = channel.config as Record<string, any>;
    const accountSid = process.env.TWILIO_ACCOUNT_SID || config.accountSid;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || config.phoneNumber;
    const apiKey = process.env.TWILIO_API_KEY || config.apiKey;

    const authToken = process.env.TWILIO_AUTH_TOKEN || config.authToken;
    
    // Verificar se temos as informações essenciais
    if (!accountSid || !fromNumber) {
      return {
        status: "error",
        message: "Configuração Twilio incompleta: accountSid e phoneNumber são obrigatórios"
      };
    }
    
    // Verificar se temos credenciais de autenticação (API Key ou authToken)
    if (!apiKey && !authToken) {
      return {
        status: "error",
        message: "Credenciais Twilio incompletas: necessária API Key ou Auth Token"
      };
    }
    
    // Format the 'to' number to WhatsApp format if needed
    // De acordo com a documentação do Twilio: https://www.twilio.com/docs/whatsapp/quickstart
    // Para usar WhatsApp com Twilio, o formato do número deve ser whatsapp:+1234567890
    const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:+${to.replace(/^\+/, '')}`;
    
    // O sandbox do Twilio utiliza um número específico com prefixo whatsapp:
    // Se o número já tiver o prefixo, usamos como está
    const whatsappFrom = fromNumber.startsWith("whatsapp:") ? 
      fromNumber : 
      `whatsapp:+${fromNumber.replace(/^\+/, '')}`;
    
    console.log(`Enviando mensagem WhatsApp de ${whatsappFrom} para ${whatsappTo}`);
    
    // Configurar autenticação - preferir API Key se disponível
    let authConfig;
    if (apiKey) {
      console.log("Usando API Key para enviar mensagem");
      authConfig = {
        username: apiKey,
        password: authToken
      };
    } else {
      console.log("Usando Account SID e Auth Token para enviar mensagem");
      authConfig = {
        username: accountSid,
        password: authToken
      };
    }
    
    // Send the message
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: whatsappFrom,
        To: whatsappTo,
        Body: content
      }),
      {
        auth: authConfig
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
