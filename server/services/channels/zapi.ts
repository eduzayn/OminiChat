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
    // De acordo com a documentação mais recente: https://developer.z-api.io/
    // A versão mais recente usa um novo formato de URL com o token no caminho
    this.baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  }
  
  // Método para obter URLs alternativas que podem ser usadas em caso de falha
  private getAlternativeBaseUrls(): string[] {
    return [
      // URLs com token no path (formato mais recente da API)
      `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`,
      
      // URLs alternativas versões mais recentes
      `https://api.z-api.io/v4/instances/${this.instanceId}/token/${this.token}`,
      
      // Alteração do path para instância
      `https://api.z-api.io/${this.instanceId}/token/${this.token}`,
      
      // Alteração de domínio
      `https://sandbox.z-api.io/instances/${this.instanceId}/token/${this.token}`
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
      console.log('Checking Z-API connection status');
      
      // Lista de todos os endpoints a serem tentados, em ordem
      const endpointsToTry = [
        { path: '/connection', description: 'latest documented status endpoint' },  // Documentação mais recente 2024
        { path: '/status', description: 'traditional status endpoint' },            // Endpoint tradicional
        { path: '/session', description: 'session endpoint' },                      // Endpoint de sessão
        { path: '/device', description: 'device info endpoint' },                   // Endpoint de informações do dispositivo
        { path: '/phone', description: 'phone endpoint' },                          // Endpoint de telefone
        { path: '/instance', description: 'instance endpoint' },                    // Endpoint de instância
        { path: '/me', description: 'account info endpoint' }                       // Endpoint de informações da conta
      ];
      
      const errors = [];
      
      // Tenta cada endpoint
      for (const endpoint of endpointsToTry) {
        try {
          console.log(`Trying ${endpoint.description}: ${endpoint.path}`);
          const response = await this.makeRequest('GET', endpoint.path);
          
          if (!response.error) {
            console.log(`Successfully got status from ${endpoint.path}`);
            
            // Preparar resposta com flag connected normalizada
            return {
              ...response,
              endpoint_used: endpoint.path,
              connected: response.connected === true || 
                        (typeof response.status === 'string' && 
                        ['connected', 'active', 'true'].includes(response.status.toLowerCase())) ||
                        // Se for endpoint de device/phone/instance sem erro, considerar conectado
                        (endpoint.path !== '/connection' && endpoint.path !== '/status' && endpoint.path !== '/session')
            };
          }
          
          // Armazena o erro para diagnóstico
          errors.push({
            endpoint: endpoint.path,
            error: response.error,
            message: response.message
          });
          
          // Se for um erro NOT_FOUND e já testamos mais de 3 endpoints, não continue tentando
          const isNotFound = response.error === 'NOT_FOUND' || 
                            (typeof response.error === 'string' && response.error.includes('NOT_FOUND'));
          if (isNotFound && errors.length >= 3) {
            console.log('Multiple NOT_FOUND errors, likely invalid credentials or incompatible API version');
            break;
          }
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint.path}:`, endpointError);
          errors.push({
            endpoint: endpoint.path,
            error: endpointError instanceof Error ? endpointError.message : 'Unknown error'
          });
        }
      }
      
      // Se todas as tentativas falharam, retorna um erro detalhado
      console.error('All status endpoints failed:', errors);
      
      // Verificar se todos os erros são NOT_FOUND, indicando provavelmente credenciais inválidas
      const allNotFound = errors.every(e => 
        e.error === 'NOT_FOUND' || 
        (typeof e.error === 'string' && e.error.includes('NOT_FOUND'))
      );
      
      if (allNotFound && errors.length > 0) {
        return {
          error: 'INVALID_CREDENTIALS',
          connected: false,
          message: 'As credenciais da Z-API parecem ser inválidas. Verifique o instanceId e token no painel da Z-API.',
          attempted_endpoints: errors.map(e => e.endpoint),
          detailed_errors: errors
        };
      }
      
      return { 
        error: 'STATUS_CHECK_FAILED',
        connected: false,
        message: 'Falha ao verificar status em todos os endpoints da Z-API. Verifique suas credenciais e a documentação atualizada.',
        attempted_endpoints: errors.map(e => e.endpoint),
        detailed_errors: errors
      };
    } catch (error) {
      console.error('Error checking Z-API status:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        connected: false,
        message: 'Erro ao verificar o status da conexão com a Z-API' 
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
    console.log(`Setting Z-API webhook to: ${webhookUrl}`);
    try {
      // De acordo com a documentação mais recente: https://developer.z-api.io/webhooks/introduction
      // Primeiro tentar com o novo formato
      const response = await this.makeRequest('POST', '/webhook', {
        value: webhookUrl // Novo formato usa 'value' em vez de 'webhook'
      });
      
      if (!response.error) {
        console.log('Successfully set webhook using new format (value)');
        return response;
      }
      
      // Se falhar, tentar com o formato antigo
      console.log('Webhook setting with new format failed, trying legacy format');
      const legacyResponse = await this.makeRequest('POST', '/webhook', {
        webhook: webhookUrl // Formato antigo usa 'webhook'
      });
      
      if (!legacyResponse.error) {
        console.log('Successfully set webhook using legacy format (webhook)');
        return legacyResponse;
      }
      
      // Se ambos falharem, tentar com outro endpoint
      console.log('Both webhook formats failed, trying alternative endpoint');
      const alternativeResponse = await this.makeRequest('POST', '/set-webhook', {
        value: webhookUrl,
        webhook: webhookUrl  // Incluir ambos para maior compatibilidade
      });
      
      return alternativeResponse;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Falha ao configurar webhook Z-API' 
      };
    }
  }

  // Get webhook configuration
  async getWebhook(): Promise<ZAPIResponse> {
    // De acordo com a documentação mais recente: https://developer.z-api.io/webhooks/introduction
    return this.makeRequest('GET', '/webhook');
  }
  
  // Obter QR Code para autenticação
  async getQRCode(): Promise<ZAPIResponse> {
    console.log('Requesting Z-API QR Code for connection');
    
    try {
      // Verificar primeiro se o dispositivo já está conectado
      const statusResponse = await this.getStatus();
      if (statusResponse.connected) {
        console.log('Device already connected, no need for QR code');
        return {
          ...statusResponse,
          message: 'Device already connected'
        };
      }
      
      // Se o status indicou erro de credenciais, não adianta tentar obter QR code
      if (statusResponse.error === 'INVALID_CREDENTIALS') {
        console.error('Cannot get QR code - invalid credentials detected in status check');
        return {
          ...statusResponse,
          error: 'INVALID_CREDENTIALS',
          message: 'Não é possível obter QR code com credenciais inválidas. Verifique o instanceId e token no painel da Z-API.'
        };
      }
      
      // Lista de todos os endpoints de QR code a serem tentados, em ordem
      // Baseado na URL na documentação Z-API mais recente
      const qrEndpointsToTry = [
        { path: '/qrcode', description: 'main QR code endpoint' },              // Principal endpoint de QR code
        { path: '/qr-code', description: 'hyphenated QR code endpoint' },      // Endpoint com hífen
        { path: '/qrcode-image', description: 'image QR code endpoint' }      // Endpoint alternativo com sufixo image
      ];
      
      // Evitar adicionar cabeçalho Client-Token quando o token já está na URL
      const options = { skipTokenHeader: true };
      
      const errors = [];
      
      // Tenta cada endpoint
      for (const endpoint of qrEndpointsToTry) {
        try {
          console.log(`Trying Z-API QR code from ${endpoint.description}: ${endpoint.path}`);
          
          // Acessa diretamente sem passar pelos headers
          const response = await this.makeRequest('GET', endpoint.path, undefined);
          
          // Se não tem erro, verificar se tem QR code na resposta
          if (!response.error) {
            // Verificar os diferentes formatos possíveis do QR code
            const qrCodeValue = response.qrcode || response.base64 || response.image || response.qrCode || response.value;
            
            if (qrCodeValue) {
              console.log(`Successfully retrieved QR code from ${endpoint.path}`);
              return {
                qrcode: qrCodeValue,
                status: 'success',
                endpoint_used: endpoint.path
              };
            } else {
              console.log(`Endpoint ${endpoint.path} returned success but no QR code data:`, response);
              // Se contém 'connected' e é true, o dispositivo já está conectado
              if (response.connected === true) {
                return {
                  ...response,
                  message: 'Device already connected'
                };
              }
            }
          }
          
          // Armazena o erro para diagnóstico
          errors.push({
            endpoint: endpoint.path,
            error: response.error,
            message: response.message
          });
        } catch (endpointError) {
          console.error(`Error with QR endpoint ${endpoint.path}:`, endpointError);
          errors.push({
            endpoint: endpoint.path,
            error: endpointError instanceof Error ? endpointError.message : 'Unknown error'
          });
        }
      }
      
      // Se todas as tentativas falharam, vamos fazer uma requisição direta para demonstração
      try {
        console.log('Trying direct API call to Z-API QR code endpoint without client library...');
        
        // Construir URL diretamente conforme documentação Z-API
        const directUrl = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}/qrcode`;
        console.log(`Making direct GET request to: ${directUrl}`);
        
        const directResponse = await axios.get(directUrl);
        
        if (directResponse?.data) {
          const qrCodeValue = directResponse.data.qrcode || 
                        directResponse.data.base64 || 
                        directResponse.data.image || 
                        directResponse.data.qrCode || 
                        directResponse.data.value;
          
          if (qrCodeValue) {
            console.log('Successfully retrieved QR code from direct API call');
            return {
              qrcode: qrCodeValue,
              status: 'success',
              endpoint_used: 'direct-call'
            };
          }
        }
      } catch (directError) {
        console.error('Error with direct API call:', directError);
        errors.push({
          endpoint: 'direct-call',
          error: directError instanceof Error ? directError.message : 'Unknown error with direct call'
        });
      }
      
      // Se todas as tentativas falharam, retornar erro detalhado
      console.error('All QR code endpoints failed:', errors);
      
      // Verificar se todos os erros são NOT_FOUND, indicando provavelmente credenciais inválidas
      const allNotFound = errors.length > 0 && errors.every(e => 
        e.error === 'NOT_FOUND' || 
        (typeof e.error === 'string' && e.error.includes('NOT_FOUND'))
      );
      
      if (allNotFound) {
        return {
          error: 'INVALID_CREDENTIALS',
          connected: false,
          message: 'As credenciais da Z-API parecem ser inválidas. Verifique o instanceId e token no painel da Z-API.',
          attempted_endpoints: errors.map(e => e.endpoint),
          detailed_errors: errors
        };
      }
      
      return { 
        error: 'QR_CODE_UNAVAILABLE',
        message: 'Não foi possível obter QR code de nenhum endpoint da Z-API. Verifique suas credenciais e a documentação atualizada.',
        attempted_endpoints: errors.map(e => e.endpoint),
        detailed_errors: errors
      };
    } catch (error) {
      console.error('Error fetching QR code:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Falha ao obter QR code. Verifique suas credenciais e a versão da API.'
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