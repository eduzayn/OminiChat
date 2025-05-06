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
  private useClientToken: boolean;

  constructor(instanceId: string, token: string, options: { useClientToken?: boolean } = {}) {
    this.instanceId = instanceId;
    this.token = token;
    this.useClientToken = options.useClientToken !== false; // default para true se não especificado
    
    // Definir URL base de acordo com o modo de autenticação
    if (this.useClientToken) {
      // Para token no header, URL não inclui o token
      this.baseUrl = `https://api.z-api.io/instances/${instanceId}`;
      console.log('Z-API configurada para usar Client-Token no header');
    } else {
      // Para token no URL, incluir no caminho
      this.baseUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
      console.log('Z-API configurada para usar token no path');
    }
  }
  
  // Método para obter combinações de URLs e modos de autenticação a serem testados
  private getApiConfigurations(): { baseUrl: string; useHeaderToken: boolean; description: string }[] {
    return [
      // Formato com token no path (documentado no Postman) - formato principal a testar
      { 
        baseUrl: `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`,
        useHeaderToken: false, 
        description: 'Token no path (formato padrão Postman)' 
      },
      
      // Formato alternativo com token no header (algumas implementações antigas)
      { 
        baseUrl: `https://api.z-api.io/instances/${this.instanceId}`,
        useHeaderToken: true, 
        description: 'Token no header Client-Token' 
      },
      
      // Formato com prefixo /v2 (possível versão mais recente)
      { 
        baseUrl: `https://api.z-api.io/v2/instances/${this.instanceId}/token/${this.token}`,
        useHeaderToken: false, 
        description: 'Prefixo /v2, token no path' 
      },
      
      // Formato com prefixo /api (algumas implementações mencionam)
      { 
        baseUrl: `https://api.z-api.io/api/instances/${this.instanceId}/token/${this.token}`,
        useHeaderToken: false, 
        description: 'Prefixo /api, token no path' 
      },
      
      // Formato URL simples sem /instances (algumas implementações mais antigas)
      { 
        baseUrl: `https://api.z-api.io/${this.instanceId}`,
        useHeaderToken: true, 
        description: 'URL simples sem /instances, token no header' 
      }
    ];
  }
  
  // Mantém método original para compatibilidade com código existente
  private getAlternativeBaseUrls(): string[] {
    const configs = this.getApiConfigurations();
    return configs.map(config => config.baseUrl);
  }

  // Método público para permitir acesso em outros componentes
  async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<ZAPIResponse> {
    // Função auxiliar para fazer a requisição com uma configuração específica de URL e autenticação
    const executeRequest = async (config: { baseUrl: string; useHeaderToken: boolean; description: string }): Promise<ZAPIResponse> => {
      try {
        const url = `${config.baseUrl}${endpoint}`;
        
        // Configurar os headers com base no método de autenticação
        const headers = {
          'Content-Type': 'application/json',
          ...(config.useHeaderToken ? { 'Client-Token': this.token } : {})
        };
        
        console.log(`Tentando ${method} para Z-API (${config.description}): ${url}`);

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
        
        // Se a resposta contém um erro "NOT_FOUND" ou similar, não consideramos sucesso
        if (response.data && 
            (response.data.error === 'NOT_FOUND' || 
             (typeof response.data.error === 'string' && response.data.error.includes('NOT_FOUND')))) {
          return {
            error: 'NOT_FOUND',
            message: response.data.message || 'Unable to find matching resource',
            status: 'error',
            config_used: config.description
          };
        }
        
        // Adiciona informação sobre qual configuração funcionou
        return {
          ...response.data,
          config_used: config.description
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          // Verificar error "Instance not found" como caso especial
          if (error.response.status === 400 && 
              error.response.data && 
              typeof error.response.data === 'object' &&
              error.response.data.error === 'Instance not found') {
            console.error(`Z-API 'Instance not found' error for ${config.baseUrl}${endpoint}`);
            return {
              error: 'INSTANCE_NOT_FOUND',
              message: 'A instância informada não foi encontrada. Verifique o instanceId no painel da Z-API.',
              status: 'error',
              config_used: config.description
            };
          }
          
          // Se é NOT_FOUND, vamos fazer um log específico para identificar o problema
          if (error.response.status === 404 || 
             (error.response.data && 
              typeof error.response.data === 'object' && 
              'message' in error.response.data && 
              error.response.data.message && 
              error.response.data.message.includes('NOT_FOUND'))) {
            console.error(`Z-API NOT_FOUND error for ${config.baseUrl}${endpoint}:`, error.response.data);
            return {
              error: 'NOT_FOUND',
              message: error.response.data.message || 'Unable to find matching resource',
              status: 'error',
              config_used: config.description
            };
          }
          
          return {
            error: `Z-API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
            status: 'error',
            config_used: config.description
          };
        }
        
        return {
          error: error instanceof Error ? error.message : 'Unknown error in Z-API request',
          status: 'error',
          config_used: config.description
        };
      }
    };

    // Primeiro tenta com a configuração padrão, baseada na preferência do usuário
    const defaultConfig = {
      baseUrl: this.baseUrl,
      useHeaderToken: this.useClientToken,
      description: this.useClientToken 
        ? 'default config with token in header' 
        : 'default config with token in path'
    };
    
    const mainResponse = await executeRequest(defaultConfig);
    
    // Se a resposta principal não contém erro, retorna imediatamente
    if (!mainResponse.error) {
      return mainResponse;
    }
    
    // Se recebemos NOT_FOUND ou INSTANCE_NOT_FOUND, tentamos com outras configurações
    if (mainResponse.error === 'NOT_FOUND' || 
        mainResponse.error === 'INSTANCE_NOT_FOUND' ||
        (typeof mainResponse.error === 'string' && 
         (mainResponse.error.includes('NOT_FOUND') || 
          mainResponse.error.includes('Instance not found')))) {
      console.log('Recebido erro de recurso não encontrado, tentando configurações alternativas para Z-API...');
      
      // Tentar cada configuração alternativa
      const alternativeConfigs = this.getApiConfigurations();
      const errors = [mainResponse];
      
      for (const config of alternativeConfigs) {
        // Pular a configuração padrão que já testamos
        if (config.baseUrl === this.baseUrl && config.useHeaderToken === this.useClientToken) {
          continue;
        }
        
        console.log(`Tentando configuração alternativa para Z-API: ${config.description}`);
        const response = await executeRequest(config);
        
        // Se alguma configuração alternativa funcionar sem erro, retorna o resultado
        if (!response.error) {
          console.log(`Configuração alternativa funcionou: ${config.description}`);
          
          // Atualiza a URL base para usar esta que funcionou nas próximas chamadas
          this.baseUrl = config.baseUrl;
          
          return response;
        }
        
        errors.push(response);
      }
      
      // Se chegamos aqui, nenhuma configuração alternativa funcionou
      console.error('Todas as configurações alternativas falharam');
      
      // Verificar se todos os erros são "Instance not found", o que indica credenciais inválidas
      const allInstanceNotFound = errors.every(e => 
        e.error === 'INSTANCE_NOT_FOUND' || 
        (typeof e.error === 'string' && e.error.includes('Instance not found'))
      );
      
      if (allInstanceNotFound) {
        return {
          error: 'INVALID_CREDENTIALS',
          message: 'ID de instância inválido. Verifique o instanceId no painel da Z-API.',
          status: 'error',
          attempted_configs: errors.map(e => e.config_used)
        };
      }
      
      // Verificar se todos os erros são NOT_FOUND, o que pode indicar mudança na API
      const allNotFound = errors.every(e => 
        e.error === 'NOT_FOUND' || 
        (typeof e.error === 'string' && e.error.includes('NOT_FOUND'))
      );
      
      if (allNotFound) {
        return {
          error: 'API_COMPATIBILITY_ERROR',
          message: 'Nenhuma versão da API Z-API conseguiu processar esta solicitação. Verifique suas credenciais e a documentação da versão atual da Z-API.',
          status: 'error',
          attempted_configs: errors.map(e => e.config_used)
        };
      }
      
      // Retornamos o erro geral para outros tipos de erro
      return {
        error: 'MULTIPLE_ERRORS',
        message: 'Múltiplos erros ao tentar acessar a API Z-API. Verifique suas credenciais e a documentação atualizada.',
        status: 'error',
        attempted_configs: errors.map(e => e.config_used),
        detailed_errors: errors
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
    console.log('Obtendo QR code da Z-API utilizando makeRequest com configuração de autenticação do usuário');
    
    try {
      // Verificar primeiro o status para não tentar obter QR code se já está conectado
      const statusResponse = await this.getStatus();
      
      if (statusResponse.connected) {
        console.log('Dispositivo já conectado, QR code não é necessário');
        return {
          ...statusResponse,
          message: 'Dispositivo já conectado'
        };
      }
      
      // Se o status indicou erro de credenciais, não adianta tentar obter QR code
      if (statusResponse.error === 'INVALID_CREDENTIALS' || statusResponse.error === 'INSTANCE_NOT_FOUND') {
        console.error('Não é possível obter QR code - credenciais inválidas detectadas na verificação de status');
        return {
          ...statusResponse,
          error: 'INVALID_CREDENTIALS',
          message: 'Não é possível obter QR code com credenciais inválidas. Verifique o instanceId e token no painel da Z-API.'
        };
      }
      
      // Lista de endpoints para obter QR code (segundo documentação da Z-API)
      // https://developer.z-api.io/instance/qrcode
      const qrEndpoints = [
        '/qrcode',                 // Endpoint principal
        '/qr-code',                // Formato alternativo 1
        '/qr-code-image',          // Formato alternativo 2
        '/get-qrcode',             // Formato alternativo 3
        '/get-qr-code',            // Formato alternativo 4
        '/code',                   // Formato alternativo 5
        '/status',                 // Pode retornar QR code em algumas versões
        '/connection'              // Pode retornar QR code em algumas versões
      ];
      
      // Registrar tentativas para diagnóstico
      const attempts: Array<{
        endpoint: string;
        success: boolean;
        error?: string;
        message?: string;
      }> = [];
      
      // Utilizar o método makeRequest para cada endpoint, que já usa a configuração de autenticação preferida
      for (const endpoint of qrEndpoints) {
        try {
          console.log(`Tentando obter QR code via ${endpoint} com modo de autenticação ${this.useClientToken ? 'Client-Token header' : 'token no path'}...`);
          
          const response = await this.makeRequest('GET', endpoint);
          
          // Se request falhou com erro, tentar próximo endpoint
          if (response.error) {
            console.log(`Endpoint ${endpoint} retornou erro: ${response.error}`);
            attempts.push({
              endpoint,
              error: response.error,
              message: response.message || 'Sem mensagem de erro',
              success: false
            });
            continue;
          }
          
          // Verificar se temos QR code na resposta (diversos formatos possíveis)
          const qrCode = response.qrcode || 
                         response.value || 
                         response.base64 || 
                         response.image ||
                         response.qrCode;
          
          if (qrCode) {
            console.log(`SUCESSO! QR code obtido do endpoint ${endpoint}`);
            return {
              qrcode: qrCode,
              status: 'success',
              message: 'QR code obtido com sucesso',
              endpoint: endpoint
            };
          }
          
          // Se dispositivo já está conectado
          if (response.connected === true) {
            console.log(`Dispositivo já conectado (detectado no endpoint ${endpoint})`);
            return {
              connected: true,
              status: 'connected',
              message: 'Dispositivo já conectado',
              endpoint: endpoint
            };
          }
          
          console.log(`Endpoint ${endpoint} não retornou QR code nem status de conexão`);
          attempts.push({
            endpoint,
            success: false,
            message: 'Resposta não contém QR code nem status de conexão'
          });
          
        } catch (error) {
          // Registrar erro que não foi capturado pelo método makeRequest
          console.error(`Erro inesperado ao acessar ${endpoint}:`, error);
          attempts.push({
            endpoint,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            success: false
          });
        }
      }
      
      // Se chegamos aqui, todas as tentativas falharam
      console.error(`Todas as ${attempts.length} tentativas de obter QR code falharam`);
      
      // Analisar os erros para dar feedback mais específico
      const clientTokenErrors = attempts.filter(a => 
        a.error === 'Client-Token is required' || 
        (a.message && a.message.includes('Client-Token'))
      );
      
      const notFoundErrors = attempts.filter(a => 
        a.error === 'NOT_FOUND' || 
        (a.error && a.error.includes('NOT_FOUND')) ||
        (a.message && a.message.includes('matching target'))
      );
      
      // Feedback baseado no padrão de erros
      if (clientTokenErrors.length > 0) {
        console.log('Padrão de erro detectado: Client-Token is required');
        return {
          error: 'AUTHENTICATION_ERROR',
          message: 'A API Z-API exige autenticação com Client-Token. Verifique se o token fornecido é válido e está no formato correto.',
          status: 'error',
          failed_attempts: attempts
        };
      }
      
      if (notFoundErrors.length === attempts.length) {
        console.log('Padrão de erro detectado: todos os endpoints retornaram NOT_FOUND');
        return {
          error: 'API_CHANGED',
          message: 'Todos os endpoints testados retornaram NOT_FOUND. A API Z-API pode ter mudado ou as credenciais estão incorretas.',
          status: 'error',
          failed_attempts: attempts
        };
      }
      
      // Erro genérico quando não conseguimos determinar um padrão específico
      return {
        error: 'QR_CODE_UNAVAILABLE',
        message: 'Não foi possível obter o QR code da Z-API. Verifique suas credenciais e a documentação atual.',
        status: 'error',
        failed_attempts: attempts
      };
    } catch (error) {
      console.error('Erro geral ao tentar obter QR code:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Falha ao obter QR code. Verifique suas credenciais e a versão da API.',
        status: 'error'
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
        message: "Credenciais Z-API ausentes (instanceId, token). Por favor, configure o canal com as credenciais corretas."
      };
    }
    
    const instanceId = config.instanceId;
    const token = config.token;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API ausentes (instanceId, token). Por favor, configure o canal com as credenciais corretas."
      };
    }

    // Extrair a opção de usar Client-Token no header (novo formato da API Z-API)
    const useClientToken = config.useClientToken !== false; // default para true se não estiver definido
    
    // Criar cliente Z-API com diagnóstico aprimorado
    console.log(`Criando cliente Z-API para instance ${instanceId.substring(0, 8)}...`);
    console.log(`Modo de autenticação: ${useClientToken ? 'Client-Token no header' : 'token no path'}`);
    const client = new ZAPIClient(instanceId, token, { useClientToken });

    // Verificar estado de conexão
    console.log('Verificando status da conexão Z-API...');
    const statusResponse = await client.getStatus();
    
    // Tratamento específico para diferentes tipos de erros
    if (statusResponse.error) {
      console.log(`[Z-API Setup] Erro ao verificar status: ${statusResponse.error}`);
      
      // Correspondência de padrões de erro para mensagens mais amigáveis
      if (statusResponse.error === 'INVALID_CREDENTIALS' || 
          statusResponse.error === 'INSTANCE_NOT_FOUND' || 
          statusResponse.error === 'INVALID_INSTANCE_ID') {
        return {
          status: "error",
          message: "Credenciais Z-API inválidas. Verifique o instanceId e token no painel da Z-API e tente novamente."
        };
      }
      
      if (statusResponse.error === 'API_COMPATIBILITY_ERROR') {
        return {
          status: "error",
          message: "Incompatibilidade com a API Z-API. A versão da API pode ter mudado desde a última atualização deste sistema. Verifique a documentação mais recente da Z-API."
        };
      }
      
      if (statusResponse.error === 'STATUS_CHECK_FAILED') {
        // Verificar se há algum indício de problema de autenticação
        const authErrors = statusResponse.detailed_errors?.filter((e: any) => 
          e.error === 'Client-Token is required' || 
          (typeof e.message === 'string' && (e.message.includes('Token') || e.message.includes('Authentication')))
        );
        
        if (authErrors && authErrors.length > 0) {
          return {
            status: "error",
            message: "Falha na autenticação Z-API. Verifique se o token está correto e tente novamente."
          };
        }
        
        return {
          status: "error",
          message: "Falha ao verificar status da conexão Z-API. Verifique se o serviço Z-API está disponível e tente novamente."
        };
      }
      
      // Outros erros não classificados
      return {
        status: "error",
        message: `Erro ao verificar status Z-API: ${statusResponse.error}. Detalhes: ${statusResponse.message || 'Nenhum detalhe disponível'}`
      };
    }

    // Se conectado, configurar webhook e retornar sucesso
    if (statusResponse.connected) {
      console.log('Z-API já está conectado. Configurando webhook...');
      
      // Determinar URL do webhook baseada no ambiente
      const webhookUrl = process.env.BASE_URL 
        ? `${process.env.BASE_URL}/api/webhooks/zapi/${channel.id}` 
        : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/zapi/${channel.id}`;
      
      console.log(`Configurando webhook para: ${webhookUrl}`);
      const webhookResponse = await client.setWebhook(webhookUrl);
      
      if (webhookResponse.error) {
        console.log(`Alerta: Erro ao configurar webhook: ${webhookResponse.error}`);
        // Continuamos mesmo com erro de webhook, já que o WhatsApp está conectado
      } else {
        console.log('Webhook configurado com sucesso');
      }

      return {
        status: "success",
        message: "WhatsApp Z-API conectado com sucesso!"
      };
    } 
    
    // Se não conectado, obter QR code
    console.log('Z-API não está conectado. Solicitando QR code...');
    const qrResponse = await client.getQRCode();
    
    // Tratamento específico para diferentes tipos de erros
    if (qrResponse.error) {
      console.log(`[Z-API Setup] Erro ao obter QR code: ${qrResponse.error}`);
      
      if (qrResponse.error === 'INVALID_CREDENTIALS' || 
          qrResponse.error === 'INSTANCE_NOT_FOUND' || 
          qrResponse.error === 'INVALID_INSTANCE_ID') {
        return {
          status: "error",
          message: "Credenciais Z-API inválidas. Verifique o instanceId e token no painel da Z-API e tente novamente."
        };
      }
      
      if (qrResponse.error === 'API_COMPATIBILITY_ERROR') {
        return {
          status: "error",
          message: "Incompatibilidade com a API Z-API ao obter QR code. A versão da API pode ter mudado. Verifique a documentação atual da Z-API."
        };
      }
      
      if (qrResponse.error === 'QR_CODE_UNAVAILABLE') {
        return {
          status: "error",
          message: "Não foi possível obter o QR code de nenhum endpoint da Z-API. Verifique se o serviço está operacional e tente novamente."
        };
      }
      
      // Outros erros não classificados
      return {
        status: "error",
        message: `Erro ao gerar QR code: ${qrResponse.error}. ${qrResponse.message || ''}`
      };
    }

    // Se o QR code foi obtido, retornar para exibição
    if (qrResponse.qrcode) {
      console.log('QR code obtido com sucesso. Aguardando escaneamento...');
      return {
        status: "pending",
        message: "Escaneie o QR code com seu WhatsApp para conectar",
        qrCode: qrResponse.qrcode
      };
    }

    // Caso de falha sem erro explícito
    console.log('Falha ao obter QR code ou status de conexão');
    return {
      status: "error",
      message: "Falha ao obter status de conexão ou QR code. Verifique suas credenciais e tente novamente."
    };
  } catch (error) {
    console.error("Erro ao configurar canal WhatsApp Z-API:", error);
    return {
      status: "error",
      message: error instanceof Error 
        ? `Erro inesperado: ${error.message}` 
        : "Erro desconhecido ao configurar WhatsApp Z-API"
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
        message: "Credenciais Z-API ausentes (instanceId, token). Por favor, configure o canal com as credenciais corretas."
      };
    }
    
    const instanceId = config.instanceId;
    const token = config.token;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API ausentes (instanceId, token). Por favor, configure o canal com as credenciais corretas."
      };
    }

    // Formatar número de telefone (remover + e caracteres especiais)
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Extrair a opção de usar Client-Token no header
    const useClientToken = config.useClientToken !== false; // default para true se não estiver definido
    
    // Criar cliente Z-API com diagnóstico aprimorado
    console.log(`Enviando mensagem WhatsApp via Z-API para ${formattedPhone.substring(0, 5)}*****`);
    console.log(`Modo de autenticação: ${useClientToken ? 'Client-Token no header' : 'token no path'}`);
    const client = new ZAPIClient(instanceId, token, { useClientToken });
    
    // Registrar tentativa de envio
    console.log(`Enviando mensagem tipo ${type}, tamanho do conteúdo: ${content?.length || 0}`);
    
    let response: ZAPIResponse;
    
    switch (type) {
      case 'image':
        if (!mediaUrl) {
          return { status: "error", message: "URL da imagem é obrigatória para mensagens de imagem" };
        }
        response = await client.sendImageMessage(formattedPhone, mediaUrl, content);
        break;
        
      case 'file':
        if (!mediaUrl) {
          return { status: "error", message: "URL do arquivo é obrigatória para mensagens de arquivo" };
        }
        response = await client.sendFileMessage(formattedPhone, mediaUrl, fileName);
        break;
        
      case 'voice':
        if (!mediaUrl) {
          return { status: "error", message: "URL do áudio é obrigatória para mensagens de voz" };
        }
        response = await client.sendVoiceMessage(formattedPhone, mediaUrl);
        break;
        
      case 'location':
        if (!extraOptions?.latitude || !extraOptions?.longitude) {
          return { status: "error", message: "Latitude e longitude são obrigatórios para mensagens de localização" };
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
          return { status: "error", message: "URL é obrigatória para mensagens com preview de link" };
        }
        response = await client.sendLinkPreview(formattedPhone, mediaUrl, content);
        break;
        
      case 'contact':
        if (!extraOptions?.contactName || !extraOptions?.contactNumber) {
          return { status: "error", message: "Nome e número do contato são obrigatórios para cartões de contato" };
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
    
    // Tratamento específico para diferentes tipos de erros
    if (response.error) {
      console.error(`Erro ao enviar mensagem Z-API WhatsApp: ${response.error}`);
      
      if (response.error === 'INVALID_CREDENTIALS' || 
          response.error === 'INSTANCE_NOT_FOUND' || 
          response.error === 'INVALID_INSTANCE_ID') {
        return {
          status: "error",
          message: "Credenciais Z-API inválidas. Verifique o instanceId e token no painel da Z-API e tente novamente."
        };
      }
      
      if (response.error === 'API_COMPATIBILITY_ERROR') {
        return {
          status: "error",
          message: "Incompatibilidade com a API Z-API. A versão da API pode ter mudado desde a última atualização deste sistema."
        };
      }
      
      if (response.error === 'Client-Token is required' || 
          (typeof response.error === 'string' && 
           (response.error.includes('token') || response.error.includes('Token')))) {
        return {
          status: "error",
          message: "Falha na autenticação Z-API. Verifique se o token está correto e tente novamente."
        };
      }
      
      // Outros erros não classificados
      return {
        status: "error",
        message: `Erro ao enviar mensagem: ${response.error}`
      };
    }
    
    console.log(`Mensagem Z-API WhatsApp enviada com sucesso para ${formattedPhone.substring(0, 5)}*****, resposta:`, response);
    return {
      status: "success",
      messageId: response.messageId || response.id,
      message: "Mensagem enviada com sucesso"
    };
  } catch (error) {
    console.error("Erro ao enviar mensagem Z-API WhatsApp:", error);
    return {
      status: "error",
      message: error instanceof Error 
        ? `Erro inesperado: ${error.message}` 
        : "Erro desconhecido ao enviar mensagem Z-API WhatsApp"
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