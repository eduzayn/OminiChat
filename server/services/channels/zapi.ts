import { Channel, ChannelConfig } from "@shared/schema";
import axios from "axios";

export interface ZAPIResponse {
  // Propriedades básicas
  phone?: string;
  connected?: boolean;
  error?: string;
  status?: string;
  message?: string;
  qrcode?: string;
  id?: string;
  messageId?: string;
  chatId?: string;
  
  // Arrays de dados
  messages?: any[];
  chats?: any[];
  
  // Propriedades adicionais
  source?: string;
  webhook?: string;      // URL do webhook configurado
  value?: string;        // Campo alternativo para webhook em algumas versões da API
  battery?: number;      // Nível de bateria
  plugged?: boolean;     // Dispositivo carregando
  device?: string;       // Modelo do dispositivo
  
  // Qualquer propriedade extra que a API possa retornar
  [key: string]: any;    // Permite propriedades adicionais não documentadas
}

// Z-API Wrapper class
export class ZAPIClient {
  private instanceId: string;
  private token: string;
  private baseUrl: string;

  constructor(instanceId: string, token: string) {
    this.instanceId = instanceId;
    this.token = token;
    
    // A Z-API possui várias versões e URLs base diferentes
    // Alguns clientes usam api.z-api.io e outros usam sandbox.z-api.io
    // Vamos definir a URL base principal, mas também tentaremos URLs alternativas se necessário
    this.baseUrl = `https://api.z-api.io/instances/${instanceId}`;
  }
  
  // Método para obter URLs alternativas que podem ser usadas em caso de falha
  private getAlternativeBaseUrls(): string[] {
    return [
      `https://sandbox.z-api.io/instances/${this.instanceId}`, // URL sandbox (ambientes de teste)
      `https://api.z-api.io/v1/instances/${this.instanceId}`,  // URL com versão explícita v1
      `https://api.z-api.io/v2/instances/${this.instanceId}`,  // URL com versão explícita v2
      `https://api.z-api.io/v3/instances/${this.instanceId}`   // URL com versão explícita v3
    ];
  }

  // Método público para permitir acesso em outros componentes
  async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<ZAPIResponse> {
    // Função auxiliar para fazer a requisição com uma URL base específica
    const executeRequest = async (baseUrl: string): Promise<ZAPIResponse> => {
      try {
        const url = `${baseUrl}${endpoint}`;
        const headers = {
          'Content-Type': 'application/json',
          'Client-Token': this.token
        };
        
        console.log(`Tentando ${method} para Z-API: ${url}`);

        let response;
        switch (method) {
          case 'GET':
            response = await axios.get(url, { headers });
            break;
          case 'POST':
            response = await axios.post(url, data, { headers });
            break;
          case 'PUT':
            response = await axios.put(url, data, { headers });
            break;
          case 'DELETE':
            response = await axios.delete(url, { headers, data });
            break;
        }

        console.log(`Resposta Z-API para ${url}: ${JSON.stringify(response.data).substring(0, 200)}...`);
        return response?.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          // Se é NOT_FOUND, vamos fazer um log específico para identificar o problema
          if (error.response.status === 404 || 
             (error.response.data && 
              typeof error.response.data === 'object' && 
              'message' in error.response.data && 
              error.response.data.message && 
              error.response.data.message.includes('NOT_FOUND'))) {
            console.error(`Z-API NOT_FOUND error for ${baseUrl}${endpoint}:`, error.response.data);
            return {
              error: 'NOT_FOUND',
              message: error.response.data.message || 'Unable to find matching resource',
              status: 'error'
            };
          }
          
          return {
            error: `Z-API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
            status: 'error'
          };
        }
        
        return {
          error: error instanceof Error ? error.message : 'Unknown error in Z-API request',
          status: 'error'
        };
      }
    };

    // Primeiro tenta com a URL base padrão
    const mainResponse = await executeRequest(this.baseUrl);
    
    // Se a resposta principal não contém erro, retorna imediatamente
    if (!mainResponse.error) {
      return mainResponse;
    }
    
    // Se recebemos NOT_FOUND, tentamos com URLs alternativas
    if (mainResponse.error === 'NOT_FOUND' || 
        (typeof mainResponse.error === 'string' && mainResponse.error.includes('NOT_FOUND'))) {
      console.log('Recebido NOT_FOUND, tentando URLs alternativas para Z-API...');
      
      // Tentar cada URL alternativa
      const alternativeUrls = this.getAlternativeBaseUrls();
      for (const altBaseUrl of alternativeUrls) {
        console.log(`Tentando URL alternativa para Z-API: ${altBaseUrl}`);
        const altResponse = await executeRequest(altBaseUrl);
        
        // Se alguma URL alternativa funcionar sem erro, retorna o resultado
        if (!altResponse.error) {
          console.log(`URL alternativa funcionou: ${altBaseUrl}`);
          
          // Atualiza a URL base para usar esta que funcionou nas próximas chamadas
          this.baseUrl = altBaseUrl;
          
          return altResponse;
        }
      }
      
      // Se chegamos aqui, nenhuma URL alternativa funcionou
      console.error('Todas as URLs alternativas falharam com NOT_FOUND');
      
      // Retornamos a resposta original com informação adicional
      return {
        ...mainResponse,
        error: 'API_COMPATIBILITY_ERROR',
        message: 'Nenhuma versão da API Z-API conseguiu processar esta solicitação. Verifique suas credenciais e a documentação da versão atual da Z-API.',
        attempted_urls: [this.baseUrl, ...alternativeUrls]
      };
    }
    
    // Para outros tipos de erro, retorna a resposta original
    return mainResponse;
  }

  // Instance Status
  async getStatus(): Promise<ZAPIResponse> {
    try {
      // Tentativa principal com /status
      const response = await this.makeRequest('GET', '/status');
      if (!response.error) {
        return response;
      }
      
      console.log('First status attempt failed, trying alternative endpoints');
      
      // Tentativa com endpoint da sessão
      const sessionResponse = await this.makeRequest('GET', '/session');
      if (!sessionResponse.error) {
        // Converter para o formato esperado pela aplicação
        return {
          ...sessionResponse,
          connected: sessionResponse.connected || sessionResponse.status === 'connected'
        };
      }
      
      // Tentativa com endpoint de device
      const deviceResponse = await this.makeRequest('GET', '/device');
      if (!deviceResponse.error) {
        return {
          ...deviceResponse,
          connected: deviceResponse.connected || deviceResponse.status === 'connected'
        };
      }
      
      // Tentativa com endpoint de phone
      const phoneResponse = await this.makeRequest('GET', '/phone');
      if (!phoneResponse.error) {
        return {
          ...phoneResponse,
          connected: true // Se o endpoint /phone responde, o dispositivo está conectado
        };
      }
      
      // Se nenhuma tentativa funcionou, retornamos a resposta original
      return response;
    } catch (error) {
      console.error('Error checking Z-API status:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        connected: false,
        message: 'Failed to check status through any available endpoint' 
      };
    }
  }
  
  // Alias para getStatus para manter compatibilidade com o código existente
  async getInstanceStatus(): Promise<ZAPIResponse> {
    return this.getStatus();
  }

  // Disconnect / Restart session
  async restartSession(): Promise<ZAPIResponse> {
    return this.makeRequest('DELETE', '/disconnect');
  }

  // Send text message
  async sendTextMessage(phone: string, message: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API text message to ${phone}`);
    return this.makeRequest('POST', '/send-text', {
      phone,
      message
    });
  }

  // Send image message
  async sendImageMessage(phone: string, image: string, caption?: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API image to ${phone}`);
    return this.makeRequest('POST', '/send-image', {
      phone,
      image, // URL or base64
      caption
    });
  }

  // Send file message
  async sendFileMessage(phone: string, file: string, fileName?: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API file to ${phone} (${fileName || 'unnamed'})`);
    return this.makeRequest('POST', '/send-file', {
      phone,
      file, // URL or base64
      fileName: fileName || `file_${Date.now()}`
    });
  }

  // Send voice message
  async sendVoiceMessage(phone: string, audioUrl: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API voice message to ${phone}`);
    return this.makeRequest('POST', '/send-audio', {
      phone,
      audio: audioUrl
    });
  }
  
  // Send location message
  async sendLocationMessage(phone: string, latitude: number, longitude: number, title?: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API location to ${phone}`);
    return this.makeRequest('POST', '/send-location', {
      phone,
      latitude,
      longitude,
      title: title || 'Localização'
    });
  }
  
  // Send link preview
  async sendLinkPreview(phone: string, url: string, text?: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API link preview to ${phone}`);
    return this.makeRequest('POST', '/send-link', {
      phone,
      url,
      text: text || url
    });
  }
  
  // Send contact card
  async sendContactCard(phone: string, contactName: string, contactNumber: string): Promise<ZAPIResponse> {
    console.log(`Sending Z-API contact card to ${phone}`);
    return this.makeRequest('POST', '/send-contact', {
      phone,
      contactName,
      contactPhone: contactNumber
    });
  }

  // Get all chats
  async getChats(): Promise<ZAPIResponse> {
    return this.makeRequest('GET', '/chats');
  }

  // Get messages from a specific chat
  async getMessages(phone: string, count = 20): Promise<ZAPIResponse> {
    return this.makeRequest('GET', `/chat/${phone}/messages?count=${count}`);
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<ZAPIResponse> {
    return this.makeRequest('POST', '/read', {
      messageId
    });
  }

  // Set webhook for message notifications
  async setWebhook(webhookUrl: string): Promise<ZAPIResponse> {
    return this.makeRequest('POST', '/webhook', {
      webhook: webhookUrl
    });
  }

  // Get webhook configuration
  async getWebhook(): Promise<ZAPIResponse> {
    return this.makeRequest('GET', '/webhook');
  }
  
  // Obter QR Code para autenticação
  async getQRCode(): Promise<ZAPIResponse> {
    console.log('Requesting Z-API QR Code for connection');
    // Tentando endpoint documentado atual
    try {
      // De acordo com a versão mais recente da documentação Z-API
      const response = await this.makeRequest('GET', '/qr-code');
      if (!response.error) {
        return response;
      }
      console.log('First QR code attempt failed, trying alternative endpoints');
      
      // Tentativa alternativa com endpoint antigo
      const altResponse = await this.makeRequest('GET', '/qrcode');
      if (!altResponse.error) {
        return altResponse;
      }
      
      // Tentativa com endpoint da sessão
      const sessionResponse = await this.makeRequest('GET', '/session');
      if (sessionResponse.qrcode || sessionResponse.connected === true) {
        return sessionResponse;
      }
      
      // Se nenhuma tentativa funcionou, retornar a resposta original
      return response;
    } catch (error) {
      console.error('Error fetching QR code:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get QR code through any available endpoint'
      };
    }
  }
}

// Setup Z-API WhatsApp channel
export async function setupZAPIChannel(channel: Channel): Promise<{ status: string; message?: string; qrCode?: string }> {
  try {
    const config = channel.config as ChannelConfig;
    
    if (!config || !config.instanceId || !config.token) {
      return {
        status: "error",
        message: "Missing Z-API credentials (instanceId, token)"
      };
    }
    
    const instanceId = config.instanceId;
    const token = config.token;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Missing Z-API credentials (instanceId, token)"
      };
    }

    // Create Z-API client
    const client = new ZAPIClient(instanceId, token);

    // Check connection status
    const statusResponse = await client.getStatus();
    
    if (statusResponse.error) {
      return {
        status: "error",
        message: `Error checking Z-API status: ${statusResponse.error}`
      };
    }

    // If connected, return success
    if (statusResponse.connected) {
      // Set webhook URL for notifications
      const webhookUrl = process.env.BASE_URL 
        ? `${process.env.BASE_URL}/api/webhooks/zapi/${channel.id}` 
        : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/zapi/${channel.id}`;
      
      await client.setWebhook(webhookUrl);

      return {
        status: "success",
        message: "Z-API WhatsApp connected successfully"
      };
    } 
    
    // If not connected, return QR code
    const qrResponse = await client.getQRCode();
    
    if (qrResponse.error) {
      return {
        status: "error",
        message: `Error generating QR code: ${qrResponse.error}`
      };
    }

    if (qrResponse.qrcode) {
      return {
        status: "pending",
        message: "Scan the QR code with WhatsApp to connect",
        qrCode: qrResponse.qrcode
      };
    }

    return {
      status: "error",
      message: "Failed to get connection status or QR code"
    };
  } catch (error) {
    console.error("Error setting up Z-API WhatsApp channel:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error setting up Z-API WhatsApp"
    };
  }
}

// Send WhatsApp message via Z-API
export async function sendZAPIWhatsAppMessage(
  channel: Channel,
  phone: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'voice' | 'location' | 'link' | 'contact' = 'text',
  mediaUrl?: string,
  fileName?: string,
  extraOptions?: any
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const config = channel.config as ChannelConfig;
    
    if (!config || !config.instanceId || !config.token) {
      return {
        status: "error",
        message: "Missing Z-API credentials (instanceId, token)"
      };
    }
    
    const instanceId = config.instanceId;
    const token = config.token;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Missing Z-API credentials (instanceId, token)"
      };
    }

    // Format phone number if needed (remove + and special chars)
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Create Z-API client
    const client = new ZAPIClient(instanceId, token);
    
    // Log sending attempt
    console.log(`Sending Z-API WhatsApp message to ${formattedPhone}, type: ${type}, content length: ${content?.length || 0}`);
    
    let response: ZAPIResponse;
    
    switch (type) {
      case 'image':
        if (!mediaUrl) {
          return { status: "error", message: "Media URL is required for image messages" };
        }
        response = await client.sendImageMessage(formattedPhone, mediaUrl, content);
        break;
        
      case 'file':
        if (!mediaUrl) {
          return { status: "error", message: "Media URL is required for file messages" };
        }
        response = await client.sendFileMessage(formattedPhone, mediaUrl, fileName);
        break;
        
      case 'voice':
        if (!mediaUrl) {
          return { status: "error", message: "Media URL is required for voice messages" };
        }
        response = await client.sendVoiceMessage(formattedPhone, mediaUrl);
        break;
        
      case 'location':
        if (!extraOptions?.latitude || !extraOptions?.longitude) {
          return { status: "error", message: "Latitude and longitude are required for location messages" };
        }
        response = await client.sendLocationMessage(
          formattedPhone, 
          extraOptions.latitude, 
          extraOptions.longitude, 
          extraOptions.title || content
        );
        break;
        
      case 'link':
        if (!mediaUrl) {
          return { status: "error", message: "URL is required for link preview messages" };
        }
        response = await client.sendLinkPreview(formattedPhone, mediaUrl, content);
        break;
        
      case 'contact':
        if (!extraOptions?.contactName || !extraOptions?.contactNumber) {
          return { status: "error", message: "Contact name and number are required for contact card messages" };
        }
        response = await client.sendContactCard(
          formattedPhone, 
          extraOptions.contactName, 
          extraOptions.contactNumber
        );
        break;
        
      case 'text':
      default:
        response = await client.sendTextMessage(formattedPhone, content);
        break;
    }
    
    if (response.error) {
      console.error(`Error sending Z-API WhatsApp message: ${response.error}`);
      return {
        status: "error",
        message: `Error sending message: ${response.error}`
      };
    }
    
    console.log(`Z-API WhatsApp message sent successfully to ${formattedPhone}, response:`, response);
    return {
      status: "success",
      messageId: response.messageId || response.id,
      message: "Message sent successfully"
    };
  } catch (error) {
    console.error("Error sending Z-API WhatsApp message:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error sending Z-API WhatsApp message"
    };
  }
}

// Process incoming webhook from Z-API
export function processZAPIWebhook(body: any): { 
  phone: string; 
  message: string; 
  messageId: string;
  name?: string;
  timestamp: number;
  isMedia: boolean;
  mediaType?: string;
  mediaUrl?: string;
  fileName?: string;
  thumbnailUrl?: string;
  duration?: number;
  isReply?: boolean;
  replyToMessageId?: string;
  replyToMessage?: string;
  source?: string;
} | null {
  try {
    // Logging the webhook for debugging
    console.log("Received Z-API webhook:", JSON.stringify(body, null, 2));
    
    // Validação básica do payload
    if (!body || !body.phone) {
      console.error("Invalid Z-API webhook payload (missing phone):", body);
      return null;
    }
    
    // Detectar o tipo de mensagem
    let messageType = "text";
    let messageContent = "";
    let mediaUrl = undefined;
    let fileName = undefined;
    let thumbnailUrl = undefined;
    let duration = undefined;
    let isMedia = false;
    
    // Verificar se é uma mensagem de mídia
    if (body.type && ['image', 'video', 'audio', 'document', 'sticker', 'ptt'].includes(body.type)) {
      isMedia = true;
      messageType = body.type;
      messageContent = body.caption || (body.text || `[${body.type}]`);
      mediaUrl = body.file || body.fileUrl || body.url;
      fileName = body.fileName || body.caption || `${body.type}_${Date.now()}`;
      
      // Informações específicas para vídeos
      if (body.type === 'video') {
        thumbnailUrl = body.thumbnail || body.thumbUrl;
        duration = body.duration || 0;
      }
      
      // Informações específicas para áudios
      if (body.type === 'audio' || body.type === 'ptt') {
        duration = body.duration || 0;
      }
    } else if (body.type === 'location') {
      // Mensagem de localização
      messageType = 'location';
      messageContent = body.title || 'Localização compartilhada';
      mediaUrl = `https://maps.google.com/maps?q=${body.latitude},${body.longitude}&z=14`;
    } else if (body.type === 'contact') {
      // Mensagem de contato
      messageType = 'contact';
      messageContent = `Contato: ${body.contactName || 'Sem nome'}`;
    } else {
      // Mensagem de texto simples
      messageContent = body.text || body.body || '';
    }
    
    // Verificar se é uma resposta a outra mensagem
    const isReply = !!body.quotedMsg;
    let replyToMessageId = undefined;
    let replyToMessage = undefined;
    
    if (isReply && body.quotedMsg) {
      replyToMessageId = body.quotedMsg.id;
      replyToMessage = body.quotedMsg.text || body.quotedMsg.caption || '[Mídia]';
    }
    
    // Retornar objeto processado
    return {
      phone: body.phone.replace(/\D/g, ''), // Remover caracteres não numéricos
      message: messageContent,
      messageId: body.id || `zapi_${Date.now()}`,
      name: body.senderName || body.contactName || body.author,
      timestamp: body.timestamp || body.messageDate || Date.now(),
      isMedia,
      mediaType: isMedia ? messageType : undefined,
      mediaUrl,
      fileName,
      thumbnailUrl,
      duration,
      isReply,
      replyToMessageId,
      replyToMessage,
      source: 'zapi' // Identificador para facilitar o processamento
    };
  } catch (error) {
    console.error("Error processing Z-API webhook:", error);
    return null;
  }
}