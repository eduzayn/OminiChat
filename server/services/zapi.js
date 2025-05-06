// Serviço para interação com a Z-API
const axios = require('axios');

/**
 * Extrai o ID da instância de uma string que pode ser uma URL ou um ID direto
 * @param {string} input - URL completa ou ID da instância
 * @returns {string} ID da instância extraído
 */
function extractInstanceId(input) {
  if (!input) return null;
  
  // Se já for um ID limpo (apenas hexadecimal de 32 caracteres), retorne-o
  if (/^[A-F0-9]{32}$/i.test(input)) {
    return input;
  }
  
  // Verificar se é uma URL ou um caminho
  if (input.includes('http') || input.includes('/')) {
    // Tentar extrair da URL usando expressão regular
    // Procura por padrões como: /instances/XXXXXXXXXXX/token/
    const instanceMatch = input.match(/\/instances\/([A-F0-9]{32})(?:\/|$)/i);
    if (instanceMatch && instanceMatch[1]) {
      return instanceMatch[1];
    }
    
    // Alternativa: procurar qualquer sequência de 32 caracteres hexadecimais
    const hexMatch = input.match(/([A-F0-9]{32})/i);
    if (hexMatch && hexMatch[1]) {
      return hexMatch[1];
    }
  }
  
  // Se não conseguir extrair, retorne o input original como fallback
  return input;
}

/**
 * Cliente Z-API que gerencia conexões e requisições para a API Z-API
 */
class ZAPIClient {
  /**
   * Cria uma nova instância do cliente Z-API
   * @param {Object} config - Configuração do cliente
   * @param {string} config.instanceId - ID da instância ou URL completa contendo o ID
   * @param {string} config.token - Token de autenticação
   */
  constructor(config) {
    this.rawInstanceId = config.instanceId;
    this.token = config.token;
    this.instanceId = extractInstanceId(config.instanceId);
    
    this.baseUrls = [
      `https://api.z-api.io/instances/${this.instanceId}`,
      `https://api.z-api.io/v2/instances/${this.instanceId}`,
      'https://api.z-api.io/v2',
    ];
    
    this.headers = {
      'Content-Type': 'application/json',
      'Client-Token': this.token
    };
    
    this.debugMode = process.env.NODE_ENV !== 'production';
  }
  
  /**
   * Obtém informações de diagnóstico do cliente
   * @returns {Object} Informações de diagnóstico
   */
  getDiagnostics() {
    return {
      original_input: this.rawInstanceId,
      extracted_instance_id: this.instanceId,
      token_length: this.token ? this.token.length : 0,
      token_preview: this.token ? `${this.token.substring(0, 5)}...` : 'none',
      base_urls: this.baseUrls,
    };
  }
  
  /**
   * Tenta fazer uma requisição com diferentes formatos de URL até que um tenha sucesso
   * @param {string} endpoint - Endpoint da API (ex: '/status', '/qr-code')
   * @param {string} method - Método HTTP (GET, POST, etc)
   * @param {Object} data - Dados para enviar no corpo da requisição (para POST/PUT)
   * @returns {Promise<Object>} Resposta da API
   */
  async request(endpoint, method = 'GET', data = null) {
    const errors = [];
    
    // Garantir que o endpoint comece com '/'
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Tentar cada formato de URL
    for (const baseUrl of this.baseUrls) {
      try {
        const url = `${baseUrl}${formattedEndpoint}`;
        
        if (this.debugMode) {
          console.log(`[Z-API] Tentando ${method} ${url}`);
        }
        
        const config = {
          method,
          url,
          headers: this.headers,
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
          config.data = data;
        }
        
        const response = await axios(config);
        
        // Verificar se a resposta contém um erro da API
        if (response.data && response.data.error) {
          errors.push({
            url,
            error: response.data.error,
            message: response.data.message || 'Sem mensagem detalhada'
          });
          continue; // Tentar o próximo formato de URL
        }
        
        // Sucesso! Retornar os dados
        if (this.debugMode) {
          console.log(`[Z-API] Sucesso com ${url}`);
        }
        
        return response.data;
      } catch (error) {
        errors.push({
          url: `${baseUrl}${formattedEndpoint}`,
          error: error.message,
          status: error.response ? error.response.status : 'unknown',
          data: error.response ? error.response.data : null
        });
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    const error = new Error('Falha em todas as tentativas de conexão com a Z-API');
    error.details = errors;
    
    if (this.debugMode) {
      console.error('[Z-API] Todas as tentativas falharam:', JSON.stringify(errors, null, 2));
    }
    
    throw error;
  }
  
  /**
   * Verifica o status da conexão com o WhatsApp
   * @returns {Promise<Object>} Status da conexão
   */
  async getStatus() {
    return this.request('/status');
  }
  
  /**
   * Obtém o QR Code para conexão com o WhatsApp
   * @returns {Promise<Object>} Objeto contendo o QR Code
   */
  async getQRCode() {
    try {
      // Tentar o endpoint normal
      return await this.request('/qr-code');
    } catch (error) {
      // Tentar alternativa sem hífen
      try {
        return await this.request('/qrcode');
      } catch (secondError) {
        // Tentar com prefixo v2 explícito
        try {
          return await this.request('/v2/qr-code');
        } catch (thirdError) {
          // Se todas falharem, lançar erro detalhado
          const combinedError = new Error('Falha ao obter QR code de todos os endpoints possíveis');
          combinedError.details = {
            firstAttempt: error.details,
            secondAttempt: secondError.details,
            thirdAttempt: thirdError.details
          };
          throw combinedError;
        }
      }
    }
  }
  
  /**
   * Envia uma mensagem de texto pelo WhatsApp
   * @param {string} phone - Número de telefone no formato E.164 (com código do país, sem + ou 0)
   * @param {string} message - Texto da mensagem
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendText(phone, message) {
    const data = {
      phone,
      message
    };
    
    try {
      // Tentar o endpoint normal
      return await this.request('/send-text', 'POST', data);
    } catch (error) {
      // Tentar alternativa com prefixo v2
      try {
        return await this.request('/v2/send-text', 'POST', data);
      } catch (secondError) {
        // Tentar com messaging 
        try {
          return await this.request('/messages/text', 'POST', data);
        } catch (thirdError) {
          // Se todas falharem, lançar erro detalhado
          const combinedError = new Error('Falha ao enviar mensagem em todos os endpoints possíveis');
          combinedError.details = {
            firstAttempt: error.details,
            secondAttempt: secondError.details,
            thirdAttempt: thirdError.details
          };
          throw combinedError;
        }
      }
    }
  }
  
  /**
   * Reinicia a conexão com o WhatsApp
   * @returns {Promise<Object>} Resultado do reinício
   */
  async restart() {
    try {
      // Tentar o endpoint normal
      return await this.request('/restart');
    } catch (error) {
      // Tentar alternativa com prefixo v2
      try {
        return await this.request('/v2/restart');
      } catch (secondError) {
        // Se ambas falharem, lançar erro detalhado
        const combinedError = new Error('Falha ao reiniciar em todos os endpoints possíveis');
        combinedError.details = {
          firstAttempt: error.details,
          secondAttempt: secondError.details
        };
        throw combinedError;
      }
    }
  }
  
  /**
   * Cria uma instância do cliente a partir das variáveis de ambiente
   * @returns {ZAPIClient} Instância do cliente Z-API
   */
  static fromEnv() {
    return new ZAPIClient({
      instanceId: process.env.ZAPI_INSTANCE_ID,
      token: process.env.ZAPI_TOKEN
    });
  }
}

module.exports = {
  ZAPIClient,
  extractInstanceId
};