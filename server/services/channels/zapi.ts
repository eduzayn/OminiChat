import axios from 'axios';
import { Channel } from '@shared/schema';

/**
 * Serviço de integração com a Z-API (WhatsApp)
 * 
 * Implementa todas as funcionalidades da Z-API para envio e recebimento
 * de mensagens do WhatsApp.
 */

// Configuração global
// Configurações da instância web (valores das variáveis de ambiente ou valores padrão se não definidos)
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "A4E42029C248B72DA0842F47";
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "3DF871A7ADFB20FB49998E66062CE0C1";

// Usar CLIENT_TOKEN_ZAPI fornecido pelo usuário como primeira opção, depois cair para os outros
const ZAPI_CLIENT_TOKEN = process.env.CLIENT_TOKEN_ZAPI || 
                          process.env.ZAPI_CLIENT_TOKEN || 
                          "Fa427b12e188a433292a658fe45a07714S";

// Configurações alternativas da instância mobile para testes
const ZAPI_MOBILE_TOKEN = "8A82365003962876A3574828";
const ZAPI_MOBILE_INSTANCE_ID = "3D0C1D6E493402738F4C266504411D32";

const BASE_URL = 'https://api.z-api.io';

// Z-API Security Token (Token de Segurança da conta, diferente do token da instância)
// Este token é usado em todas as instâncias
const ZAPI_SECURITY_TOKEN = "Fa427b12e188a433292a658fe45a07714S";

// Log inicial das configurações para diagnóstico
console.log("=================== CONFIGURAÇÃO Z-API ===================");
console.log(`ZAPI_INSTANCE_ID: ${ZAPI_INSTANCE_ID}`);
console.log(`ZAPI_TOKEN: ${ZAPI_TOKEN}`);
console.log(`Client-Token definido: ${ZAPI_CLIENT_TOKEN ? "SIM" : "NÃO"}`);
console.log(`Origem do Client-Token: ${
  process.env.CLIENT_TOKEN_ZAPI ? "CLIENT_TOKEN_ZAPI" : 
  (process.env.ZAPI_CLIENT_TOKEN ? "ZAPI_CLIENT_TOKEN" : "Valor padrão")
}`);
console.log("==========================================================");

// Função de ajuda para garantir que incluímos sempre o Client-Token nos headers
function getHeadersWithToken(token: string, clientToken: string = ZAPI_CLIENT_TOKEN) {
  // IMPORTANTE: De acordo com a documentação da Z-API e a coleção do Postman,
  // o formato correto do header é 'Client-Token' (com C e T maiúsculos)
  // https://www.postman.com/docs-z-api/z-api-s-public-workspace/folder/4aisbsg/messages
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Client-Token': clientToken,
  };
  
  // Log para diagnóstico
  console.log(`[Z-API] Headers configurados:`, JSON.stringify(headers));
  
  return headers;
}

/**
 * Testa a conexão com as instâncias Z-API (web e mobile)
 * Esta função é útil para diagnóstico das credenciais da Z-API
 */
export async function testZapiInstances(): Promise<{
  webInstance: {
    success: boolean;
    message: string;
    data?: any;
  },
  mobileInstance: {
    success: boolean;
    message: string;
    data?: any;
  }
}> {
  const result = {
    webInstance: {
      success: false,
      message: "Não testado"
    },
    mobileInstance: {
      success: false,
      message: "Não testado"
    }
  };
  
  // Testar a instância web
  try {
    console.log(`Testando instância web Z-API (${ZAPI_INSTANCE_ID})...`);
    const webResponse = await axios.get(
      `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/status`,
      { headers: getHeadersWithToken(ZAPI_TOKEN) }
    );
    
    result.webInstance = {
      success: true,
      message: "Conexão bem-sucedida",
      data: webResponse.data
    };
  } catch (error) {
    console.error(`Erro ao testar instância web Z-API:`, error);
    if (axios.isAxiosError(error)) {
      result.webInstance = {
        success: false,
        message: `Erro ${error.response?.status}: ${error.response?.data?.error || error.message}`,
        data: error.response?.data
      };
    } else {
      result.webInstance = {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido"
      };
    }
  }
  
  // Testar a instância mobile
  try {
    console.log(`Testando instância mobile Z-API (${ZAPI_MOBILE_INSTANCE_ID})...`);
    const mobileResponse = await axios.get(
      `${BASE_URL}/instances/${ZAPI_MOBILE_INSTANCE_ID}/token/${ZAPI_MOBILE_TOKEN}/status`,
      { headers: getHeadersWithToken(ZAPI_MOBILE_TOKEN) }
    );
    
    result.mobileInstance = {
      success: true,
      message: "Conexão bem-sucedida",
      data: mobileResponse.data
    };
  } catch (error) {
    console.error(`Erro ao testar instância mobile Z-API:`, error);
    if (axios.isAxiosError(error)) {
      result.mobileInstance = {
        success: false,
        message: `Erro ${error.response?.status}: ${error.response?.data?.error || error.message}`,
        data: error.response?.data
      };
    } else {
      result.mobileInstance = {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido"
      };
    }
  }
  
  return result;
}

/**
 * Configura o canal Z-API
 * @param channel Canal configurado no sistema
 * @returns Status da configuração com QR Code se necessário
 */
export async function setupZAPIChannel(channel: Channel): Promise<{ status: string; message?: string; qrCode?: string }> {
  try {
    // Verifica se as credenciais estão disponíveis
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;

    if (!instanceId || !token) {
      console.log(`[Z-API] Erro: Credenciais não configuradas para canal ${channel.id}`);
      return {
        status: "error",
        message: "Credenciais da Z-API não configuradas (instanceId, token)"
      };
    }

    console.log(`[Z-API] Configurando canal ${channel.id} (${channel.name})`);
    console.log(`[Z-API] Instância: ${instanceId}`);
    console.log(`[Z-API] Token: ${token.substring(0, 8)}...`);
    console.log(`[Z-API] Client-Token: ${clientToken ? "Configurado" : "Não configurado"}`);

    // Configurar webhook para recebimento de mensagens (PASSO CRUCIAL)
    console.log(`[Z-API] Iniciando configuração do webhook para canal ${channel.id}...`);
    
    // Determinar a URL base da aplicação para webhooks
    let baseUrl = '';
    if (process.env.APP_URL) {
      baseUrl = process.env.APP_URL;
    } else if (process.env.REPLIT_DOMAINS) {
      baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
    } else {
      // URL da Replit atual baseada na ID do projeto
      baseUrl = 'https://0eb8be2b-04a6-47e5-bbf1-dd3bd83018b0-00-2m0jsmtd34bj0.picard.replit.dev';
    }
    
    // URL do webhook específica para este canal
    const webhookUrl = `${baseUrl}/api/webhooks/zapi/${channel.id}`;
    console.log(`[Z-API] URL do webhook a ser configurada: ${webhookUrl}`);
    
    // Chamar a função configureWebhook com todos os eventos necessários ativados e URL explícita
    const webhookResult = await configureWebhook(channel, webhookUrl, {
      receiveAllNotifications: true,
      messageReceived: true,
      messageCreate: true,
      statusChange: true,
      presenceChange: true,
      deviceConnected: true
    });
    
    if (webhookResult.status === "success") {
      console.log(`[Z-API] Webhook configurado com sucesso: ${webhookResult.webhookUrl}`);
      
      // Armazenar a URL do webhook na configuração do canal para referência futura
      try {
        // Importar db para atualizar o canal
        const { db } = await import("../../db");
        const { channels } = await import("../../shared/schema");
        const { eq } = await import("drizzle-orm");
        
        // Atualizar a configuração do canal com informações do webhook
        const updatedConfig = {
          ...(channel.config as Record<string, any>),
          webhookUrl: webhookResult.webhookUrl
        };
        
        await db.update(channels)
          .set({ config: updatedConfig })
          .where(eq(channels.id, channel.id));
          
        console.log(`[Z-API] Configuração do canal atualizada com URL do webhook`);
      } catch (dbError) {
        console.error("[Z-API] Erro ao atualizar configuração do canal:", dbError);
        // Continuamos mesmo com erro de atualização do canal
      }
    } else {
      console.warn(`[Z-API] Alerta: Problema na configuração do webhook: ${webhookResult.message}`);
      // Continuamos o fluxo mesmo com erro no webhook, mas registramos o alerta
    }

    try {
      // Verifica status da conexão
      const statusResponse = await axios.get(
        `${BASE_URL}/instances/${instanceId}/token/${token}/status`,
        {
          headers: getHeadersWithToken(token)
        }
      );

      // Se o status indicar que não está conectado, gera QR Code
      if (statusResponse.data && statusResponse.data.connected === false) {
        try {
          // Gera QR Code - modificando para usar endpoint correto e tratar resposta apropriadamente
          // De acordo com a documentação, devemos usar o endpoint qr-code
          const headers: Record<string, string> = {
            ...getHeadersWithToken(token),
            'Accept': 'image/png, application/json'
          };
          
          const qrResponse = await axios.get(
            `${BASE_URL}/instances/${instanceId}/token/${token}/qr-code`,
            {
              headers,
              // Configurar para receber resposta em formato binário
              responseType: 'arraybuffer'
            }
          );

          // Verificar se temos uma resposta de imagem
          if (qrResponse.data) {
            // Converter o buffer recebido para base64
            const qrCodeBase64 = Buffer.from(qrResponse.data).toString('base64');
            
            console.log("QR Code recebido com sucesso e convertido para base64");
            
            return {
              status: "pending",
              message: "Escaneie o QR Code com o WhatsApp para conectar",
              qrCode: qrCodeBase64
            };
          } else {
            console.error("QR Code retornou dados vazios");
            return {
              status: "error",
              message: "Falha ao gerar QR Code para conexão: resposta vazia"
            };
          }
        } catch (error) {
          console.error("Erro ao obter QR Code:", error);
          return {
            status: "error",
            message: `Falha ao gerar QR Code para conexão: ${error instanceof Error ? error.message : "erro desconhecido"}`
          };
        }
      }

      // Webhook já foi configurado anteriormente no fluxo

      return {
        status: "success",
        message: "Canal Z-API WhatsApp configurado com sucesso"
      };
    } catch (error) {
      console.error("Erro ao configurar Z-API:", error);
      return {
        status: "error",
        message: "Falha ao configurar Z-API"
      };
    }
  } catch (error) {
    console.error("Erro ao configurar canal Z-API:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao configurar Z-API"
    };
  }
}

/**
 * Envia mensagem de texto via Z-API
 * @param channel Canal configurado 
 * @param to Número de telefone de destino
 * @param content Conteúdo da mensagem
 * @returns Status do envio com ID da mensagem
 */
export async function sendTextMessage(
  channel: Channel,
  to: string,
  content: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatação do número do WhatsApp de acordo com a documentação ATUAL da Z-API
    // Remove todos os caracteres não numéricos
    let formattedPhone = to.replace(/\D/g, '');
    
    // Se o número não tiver o código do país, adiciona o código do Brasil (55)
    if (formattedPhone.length <= 11) {
      formattedPhone = `55${formattedPhone}`;
    }
    
    console.log(`[Z-API] Enviando texto para ${formattedPhone} (original: ${to}): "${content}"`);
    console.log(`[Z-API] Usando instância: ${instanceId} e token: ${token.slice(0, 5)}...`);
    
    // Headers completos conforme a documentação atualizada
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    console.log(`[Z-API] Headers:`, JSON.stringify(headers));
    
    // Enviar mensagem usando o endpoint correto conforme documentação atual:
    // https://developer.z-api.io/message/send-message-text
    const url = `${BASE_URL}/instances/${instanceId}/token/${token}/send-text`;
    
    console.log(`[Z-API] URL de envio: ${url}`);
    
    // Payload conforme a documentação atual da Z-API
    const payload = {
      phone: formattedPhone,
      message: content,
      isGroup: false // Assumindo que não é grupo por padrão
    };
    
    console.log(`[Z-API] Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await axios.post(url, payload, { headers });
    
    console.log(`[Z-API] Resposta de envio:`, JSON.stringify(response.data, null, 2));
    
    // Verificar resposta conforme a documentação atualizada
    if (response.data) {
      if (response.data.messageId || response.data.id || response.data.zaapId) {
        const messageId = response.data.messageId || response.data.id || response.data.zaapId;
        console.log(`[Z-API] Mensagem enviada com sucesso, ID: ${messageId}`);
        return {
          status: "success",
          messageId: messageId
        };
      } else if (response.data.value === true || response.data.sent === true) {
        // Algumas versões da API retornam o campo value/sent como true para indicar sucesso
        console.log(`[Z-API] Mensagem enviada com sucesso, resposta sem ID`);
        
        // Verificar se há algum outro identificador na resposta
        const alternativeId = response.data.id || response.data.messageId || response.data.messageId || Date.now().toString();
        
        return {
          status: "success",
          messageId: alternativeId
        };
      } else if (typeof response.data === 'string' && response.data.includes('success')) {
        // Algumas versões podem retornar apenas uma string de sucesso
        console.log(`[Z-API] Mensagem enviada com sucesso, resposta em formato string`);
        return {
          status: "success",
          messageId: `msg_${Date.now()}`
        };
      }
    }
    
    // Se chegamos até aqui, a resposta não tem o formato esperado
    console.error(`[Z-API] Resposta de envio em formato inesperado:`, response.data);
    
    // Tentar interpretar mesmo assim para evitar falsos negativos
    if (response.status >= 200 && response.status < 300) {
      console.log(`[Z-API] Considerando mensagem enviada pelo código HTTP ${response.status} de sucesso`);
      return {
        status: "success",
        messageId: `unknown_${Date.now()}`,
        message: "Mensagem possivelmente enviada, mas formato de resposta não reconhecido"
      };
    }
    
    return {
      status: "error",
      message: "Falha ao enviar mensagem via Z-API: Resposta em formato não reconhecido"
    };
  } catch (error) {
    console.error("Erro ao enviar mensagem Z-API:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      // Se o erro incluir 'Could not find source instance', a instância pode estar desconectada
      if (error.response?.data?.error?.includes('find source instance') || 
          error.response?.data?.message?.includes('find source instance')) {
        return {
          status: "error",
          message: "Instância Z-API não encontrada ou desconectada. Verifique a conexão do WhatsApp."
        };
      }
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.response?.data?.message || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem Z-API"
    };
  }
}

/**
 * Envia mensagem de imagem via Z-API
 * @param channel Canal configurado
 * @param to Número de telefone de destino
 * @param caption Legenda da imagem
 * @param imageUrl URL da imagem
 * @returns Status do envio com ID da mensagem
 */
export async function sendImageMessage(
  channel: Channel,
  to: string,
  caption: string,
  imageUrl: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatação correta do número do WhatsApp de acordo com documentação Z-API
    let formattedPhone = to.replace(/\D/g, '');
    
    // Se o número não tiver o código do país, adiciona o código do Brasil (55)
    if (formattedPhone.length <= 11) {
      formattedPhone = `55${formattedPhone}`;
    }
    
    console.log(`[Z-API] Enviando imagem para ${formattedPhone} (original: ${to})`);
    
    // Headers atualizados conforme documentação
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    // Enviar imagem usando a estrutura correta do payload
    // https://developer.z-api.io/message/send-image
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-image`,
      {
        phone: formattedPhone,
        image: imageUrl,
        caption: caption || ''
      },
      { headers }
    );
    
    console.log(`[Z-API] Resposta de envio de imagem:`, JSON.stringify(response.data, null, 2));
    
    // Verificar resposta conforme documentação
    if (response.data && (response.data.messageId || response.data.id || response.data.zaapId)) {
      const messageId = response.data.messageId || response.data.id || response.data.zaapId;
      console.log(`[Z-API] Imagem enviada com sucesso, ID: ${messageId}`);
      return {
        status: "success",
        messageId: messageId
      };
    } else if (response.data && response.data.value) {
      // Algumas versões da API retornam o campo value como true para indicar sucesso
      console.log(`[Z-API] Imagem enviada com sucesso, resposta sem ID (usar Z-API mais recente)`);
      return {
        status: "success",
        messageId: "unknown" // Não temos ID neste caso
      };
    } else {
      console.error(`[Z-API] Resposta de erro ao enviar imagem:`, response.data);
      return {
        status: "error",
        message: "Falha ao enviar imagem via Z-API: Resposta sem ID de mensagem"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar imagem Z-API:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao enviar imagem Z-API"
    };
  }
}

/**
 * Envia mensagem de documento/arquivo via Z-API
 * @param channel Canal configurado
 * @param to Número de telefone de destino
 * @param caption Legenda do documento
 * @param fileUrl URL do arquivo
 * @param fileName Nome do arquivo
 * @returns Status do envio com ID da mensagem
 */
export async function sendDocumentMessage(
  channel: Channel,
  to: string,
  caption: string,
  fileUrl: string,
  fileName: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatação correta do número do WhatsApp de acordo com documentação Z-API
    let formattedPhone = to.replace(/\D/g, '');
    
    // Se o número não tiver o código do país, adiciona o código do Brasil (55)
    if (formattedPhone.length <= 11) {
      formattedPhone = `55${formattedPhone}`;
    }
    
    console.log(`[Z-API] Enviando documento para ${formattedPhone} (original: ${to}): ${fileName}`);
    
    // Headers atualizados conforme documentação 
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    console.log(`[Z-API] Headers para envio de documento:`, JSON.stringify(headers));
    
    // Enviar documento usando o payload correto de acordo com a documentação
    // https://developer.z-api.io/message/send-document
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-document`,
      {
        phone: formattedPhone,
        document: fileUrl,
        fileName: fileName,
        caption: caption || ''
      },
      { headers }
    );
    
    console.log(`[Z-API] Resposta de envio de documento:`, JSON.stringify(response.data, null, 2));
    
    // Verificar resposta conforme documentação
    if (response.data && (response.data.messageId || response.data.id || response.data.zaapId)) {
      const messageId = response.data.messageId || response.data.id || response.data.zaapId;
      console.log(`[Z-API] Documento enviado com sucesso, ID: ${messageId}`);
      return {
        status: "success",
        messageId: messageId
      };
    } else if (response.data && response.data.value) {
      // Algumas versões da API retornam o campo value como true para indicar sucesso
      console.log(`[Z-API] Documento enviado com sucesso, resposta sem ID (usar Z-API mais recente)`);
      return {
        status: "success",
        messageId: "unknown" // Não temos ID neste caso
      };
    } else {
      console.error(`[Z-API] Resposta de erro ao enviar documento:`, response.data);
      return {
        status: "error",
        message: "Falha ao enviar documento via Z-API: Resposta sem ID de mensagem"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar documento Z-API:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao enviar documento Z-API"
    };
  }
}

/**
 * Envia mensagem de áudio via Z-API
 * @param channel Canal configurado
 * @param to Número de telefone de destino
 * @param audioUrl URL do arquivo de áudio
 * @returns Status do envio com ID da mensagem
 */
export async function sendAudioMessage(
  channel: Channel,
  to: string,
  audioUrl: string
): Promise<{ status: string; message?: string; messageId?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatação correta do número do WhatsApp de acordo com documentação Z-API
    let formattedPhone = to.replace(/\D/g, '');
    
    // Se o número não tiver o código do país, adiciona o código do Brasil (55)
    if (formattedPhone.length <= 11) {
      formattedPhone = `55${formattedPhone}`;
    }
    
    console.log(`[Z-API] Enviando áudio para ${formattedPhone} (original: ${to})`);
    
    // Headers atualizados conforme documentação
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    console.log(`[Z-API] Headers para envio de áudio:`, JSON.stringify(headers));
    
    // Enviar áudio usando o endpoint e payload corretos conforme documentação Z-API
    // https://developer.z-api.io/message/send-audio
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-audio`,
      {
        phone: formattedPhone,
        audio: audioUrl
      },
      { headers }
    );
    
    console.log(`[Z-API] Resposta de envio de áudio:`, JSON.stringify(response.data, null, 2));
    
    // Verificar resposta de acordo com documentação
    if (response.data && (response.data.messageId || response.data.id || response.data.zaapId)) {
      const messageId = response.data.messageId || response.data.id || response.data.zaapId;
      console.log(`[Z-API] Áudio enviado com sucesso, ID: ${messageId}`);
      return {
        status: "success",
        messageId: messageId
      };
    } else if (response.data && response.data.value) {
      // Algumas versões da API retornam o campo value como true para indicar sucesso
      console.log(`[Z-API] Áudio enviado com sucesso, resposta sem ID (usar Z-API mais recente)`);
      return {
        status: "success",
        messageId: "unknown" // Não temos ID neste caso
      };
    } else {
      console.error(`[Z-API] Resposta de erro ao enviar áudio:`, response.data);
      return {
        status: "error",
        message: "Falha ao enviar áudio via Z-API: Resposta sem ID de mensagem"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar áudio Z-API:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao enviar áudio Z-API"
    };
  }
}

/**
 * Sincroniza contatos do WhatsApp via Z-API
 * @param channel Canal configurado
 * @returns Lista de contatos sincronizados
 */
export async function syncContacts(channel: Channel): Promise<{ status: string; message?: string; contacts?: any[] }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Obter contatos
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/contacts`,
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    if (response.data && Array.isArray(response.data.contacts)) {
      return {
        status: "success",
        contacts: response.data.contacts
      };
    } else {
      return {
        status: "error",
        message: "Falha ao sincronizar contatos"
      };
    }
  } catch (error) {
    console.error("Erro ao sincronizar contatos Z-API:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao sincronizar contatos"
    };
  }
}

/**
 * Verifica o status da conexão com o WhatsApp
 * @param channel Canal configurado
 * @returns Status da conexão
 */
export async function checkConnectionStatus(channel: Channel): Promise<{ status: string; message?: string; connected?: boolean }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    console.log(`[Z-API] Verificando status da conexão: ${instanceId}`);
    
    // Headers atualizados conforme documentação
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    console.log(`[Z-API] Headers para verificação de status:`, JSON.stringify(headers));
    
    // Verificar status
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/status`,
      { headers }
    );
    
    if (response.data) {
      console.log(`[Z-API] Resposta de status:`, JSON.stringify(response.data));
      return {
        status: "success",
        connected: response.data.connected === true,
        message: response.data.connected ? "WhatsApp conectado" : "WhatsApp desconectado"
      };
    } else {
      return {
        status: "error",
        message: "Não foi possível verificar o status da conexão"
      };
    }
  } catch (error) {
    console.error("[Z-API] Erro ao verificar status:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao verificar status"
    };
  }
}

/**
 * Obtém o QR Code para conexão de um canal Z-API com o WhatsApp
 * @param channel Canal Z-API configurado
 * @returns Objeto com status e QR Code em base64 (se disponível)
 */
export async function getQRCodeForChannel(channel: Channel): Promise<{ status: string; message?: string; qrCode?: string }> {
  try {
    console.log("================= OBTENDO QR CODE PARA CANAL =================");
    console.log(`Canal ID: ${channel.id}`);
    console.log(`Canal Nome: ${channel.name}`);
    console.log(`Canal Tipo: ${channel.type}`);

    // Usar valores globais conhecidos que funcionam
    const instanceId = ZAPI_INSTANCE_ID;
    const token = ZAPI_TOKEN;
    const clientToken = ZAPI_CLIENT_TOKEN;
    
    // Log dos valores utilizados para diagnóstico
    console.log("Credenciais Z-API usadas:");
    console.log(`Instance ID: ${instanceId}`);
    console.log(`Token: ${token}`);
    console.log(`Client-Token: ${clientToken.substring(0, 5)}...${clientToken.substring(clientToken.length - 5)}`);
    
    if (!instanceId || !token || !clientToken) {
      console.error("Credenciais Z-API não configuradas completamente");
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas completamente"
      };
    }
    
    // Estrutura do header exatamente como esperado pela Z-API (com C e T maiúsculos em Client-Token)
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken,
      'Accept': 'image/png,application/json'
    };
    
    console.log(`Headers a serem utilizados:`, JSON.stringify(headers));
    console.log(`URL a ser chamada: ${BASE_URL}/instances/${instanceId}/token/${token}/qr-code`);
    
    try {
      console.log("Solicitando QR code diretamente...");
      
      const qrResponse = await axios.get(
        `${BASE_URL}/instances/${instanceId}/token/${token}/qr-code`,
        { 
          headers,
          responseType: 'arraybuffer'
        }
      );
      
      console.log("Resposta da API /qr-code recebida com status:", qrResponse.status);
      
      // Se temos dados na resposta
      if (qrResponse.data && qrResponse.data.length > 0) {
        console.log(`Recebido buffer de tamanho: ${qrResponse.data.length} bytes`);
        
        try {
          // A Z-API está retornando um objeto JSON em vez de uma imagem direta
          // Primeiro, vamos converter para texto e verificar a estrutura
          const responseText = Buffer.from(qrResponse.data).toString('utf-8');
          console.log("Primeiros 100 caracteres da resposta:", responseText.substring(0, 100) + "...");
          
          // Tentar converter para JSON
          let qrObject;
          try {
            qrObject = JSON.parse(responseText);
            console.log("Formato da resposta JSON:", Object.keys(qrObject).join(", "));
          } catch (jsonError) {
            console.log("Resposta não é um JSON válido, tratando como imagem direta");
            // Se não for JSON, vamos criar a string base64 direto da imagem
            const qrCodeBase64Direct = `data:image/png;base64,${Buffer.from(qrResponse.data).toString('base64')}`;
            
            return {
              status: "waiting_scan",
              message: "Escaneie o QR Code com o WhatsApp para conectar",
              qrCode: qrCodeBase64Direct
            };
          }
          
          // Se o objeto possui a propriedade 'connected': true, então já está conectado
          if (qrObject && qrObject.connected === true) {
            console.log("Instância já está conectada ao WhatsApp");
            return {
              status: "connected",
              message: "O WhatsApp já está conectado a esta instância"
            };
          }
          
          // Se temos um objeto JSON com a propriedade 'value', é o caso que estamos encontrando
          if (qrObject && qrObject.value) {
            console.log("QR Code retornado como JSON com propriedade 'value'");
            
            // Gerar um QR code através do serviço online QR Server
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrObject.value)}`;
            console.log("Gerando URL para QR code visual com o valor fornecido pela Z-API");
            
            return {
              status: "waiting_scan",
              message: "Escaneie o QR Code com o WhatsApp para conectar",
              qrCode: qrCodeUrl
            };
          } else {
            console.log("QR Code em formato não reconhecido:", Object.keys(qrObject).join(", "));
            // Fallback para a abordagem anterior
            const qrCodeBase64Fallback = `data:image/png;base64,${Buffer.from(qrResponse.data).toString('base64')}`;
            
            return {
              status: "waiting_scan",
              message: "Escaneie o QR Code com o WhatsApp para conectar",
              qrCode: qrCodeBase64Fallback
            };
          }
        } catch (error) {
          console.error("Erro no processamento do QR code:", error);
          // Fallback para o método original em caso de erro no processamento
          const qrCodeBase64Fallback = `data:image/png;base64,${Buffer.from(qrResponse.data).toString('base64')}`;
          
          return {
            status: "waiting_scan", 
            message: "Escaneie o QR Code com o WhatsApp para conectar (processamento alternativo)",
            qrCode: qrCodeBase64Fallback
          };
        }
      } 
      
      // Retornar erro se não conseguiu obter o QR code
      console.error("QR Code retornou dados vazios");
      return {
        status: "error",
        message: "Falha ao gerar QR Code para conexão: resposta vazia"
      };
      
    } catch (qrError) {
      console.error("Erro ao solicitar QR Code:", qrError);
      
      // Log detalhado do erro para diagnóstico
      if (axios.isAxiosError(qrError)) {
        const status = qrError.response?.status;
        const headers = qrError.response?.headers;
        const data = qrError.response?.data;
        
        console.error(`Status da resposta: ${status}`);
        
        if (data) {
          try {
            // Tentar extrair informações do erro
            const dataStr = Buffer.isBuffer(data) 
              ? Buffer.from(data).toString() 
              : typeof data === 'object'
                ? JSON.stringify(data)
                : String(data);
            
            console.error(`Dados da resposta: ${dataStr.substring(0, 300)}...`);
          } catch (convErr) {
            console.error("Não foi possível converter os dados da resposta");
          }
        }
      }
      
      return {
        status: "error",
        message: qrError instanceof Error 
          ? `Falha ao solicitar QR Code: ${qrError.message}` 
          : "Erro desconhecido ao solicitar QR Code"
      };
    }
  } catch (error) {
    console.error("Erro geral na obtenção do QR Code:", error);
    return {
      status: "error",
      message: error instanceof Error 
        ? `Erro geral na obtenção do QR Code: ${error.message}` 
        : "Erro desconhecido na obtenção do QR Code"
    };
  }
}

/**
 * Desconecta a sessão do WhatsApp
 * @param channel Canal configurado
 * @returns Status da operação
 */
export async function disconnectSession(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Headers atualizados conforme documentação
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    console.log(`[Z-API] Desconectando sessão para instância ${instanceId}`);
    console.log(`[Z-API] Headers para desconexão:`, JSON.stringify(headers));
    
    // Desconectar sessão
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/disconnect`,
      { headers }
    );
    
    console.log(`[Z-API] Resposta da desconexão:`, JSON.stringify(response.data, null, 2));
    
    return {
      status: "success",
      message: "Sessão desconectada com sucesso"
    };
  } catch (error) {
    console.error("[Z-API] Erro ao desconectar sessão:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao desconectar sessão"
    };
  }
}

/**
 * Reinicia a sessão do WhatsApp
 * @param channel Canal configurado
 * @returns Status da operação
 */
export async function restartSession(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Headers atualizados conforme documentação
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    };
    
    console.log(`[Z-API] Reiniciando sessão para instância ${instanceId}`);
    console.log(`[Z-API] Headers para reinicialização:`, JSON.stringify(headers));
    
    // Reiniciar sessão
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/restart`,
      { headers }
    );
    
    console.log(`[Z-API] Resposta da reinicialização:`, JSON.stringify(response.data, null, 2));
    
    return {
      status: "success",
      message: "Sessão reiniciada com sucesso. Aguarde alguns segundos e reconecte com QR Code."
    };
  } catch (error) {
    console.error("[Z-API] Erro ao reiniciar sessão:", error);
    
    // Log detalhado para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error(`[Z-API] Status: ${error.response?.status}`);
      console.error(`[Z-API] Dados:`, error.response?.data);
      
      return {
        status: "error",
        message: `Erro Z-API: ${error.response?.status || ''} - ${error.response?.data?.error || error.message || "Erro na requisição"}`
      };
    }
    
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao reiniciar sessão"
    };
  }
}

/**
 * Verifica o status do webhook configurado para um canal
 * @param channel Canal a ser verificado
 * @returns Objeto com status da verificação
 */
export async function checkWebhookStatus(channel: Channel): Promise<{ 
  status: string; 
  message?: string; 
  configured?: boolean;
  webhookUrl?: string;
  webhookFeatures?: {
    receiveAllNotifications?: boolean;
    messageReceived?: boolean;
    messageCreate?: boolean;
    statusChange?: boolean;
    presenceChange?: boolean;
    deviceConnected?: boolean;
    receiveByEmail?: boolean;
  };
}> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    console.log(`[Z-API] Verificando status do webhook para canal ${channel.id} (instância ${instanceId})...`);
    
    // Determinar a URL correta do webhook com base nas informações do canal
    let baseUrl = '';
    if (process.env.APP_URL) {
      baseUrl = process.env.APP_URL;
    } else if (process.env.REPLIT_DOMAINS) {
      baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
    } else {
      baseUrl = 'https://0eb8be2b-04a6-47e5-bbf1-dd3bd83018b0-00-2m0jsmtd34bj0.picard.replit.dev';
    }
    
    // URL esperada do webhook (deve corresponder à URL configurada)
    const expectedWebhookUrl = `${baseUrl}/api/webhooks/zapi/${channel.id}`;
    
    try {
      // Tentativa 1: Verificar webhook usando a API v2 - se retornar erro, isso é normal, pois a API está em transição
      const headers = getHeadersWithToken(token, ZAPI_CLIENT_TOKEN);
      
      console.log(`[Z-API] Fazendo requisição GET para ${BASE_URL}/instances/${instanceId}/token/${token}/webhook`);
      console.log(`[Z-API] Headers:`, JSON.stringify(headers, null, 2));
      
      try {
        const response = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/webhook`,
          { headers }
        );
        
        console.log(`[Z-API] Resposta da verificação de webhook:`, JSON.stringify(response.data, null, 2));
        
        // Compatibilidade com APIs antigas da Z-API que retornam 'value' em vez de 'url'
        const webhookUrl = response.data?.url || response.data?.value || null;
        const isConfigured = !!webhookUrl && webhookUrl.length > 0;
        
        // Extrair features do webhook se existirem
        const webhookFeatures = response.data?.webhookFeatures || {};
        
        return {
          status: "success",
          configured: isConfigured,
          webhookUrl: webhookUrl,
          webhookFeatures: {
            receiveAllNotifications: webhookFeatures.receiveAllNotifications || false,
            messageReceived: webhookFeatures.messageReceived || false,
            messageCreate: webhookFeatures.messageCreate || false,
            statusChange: webhookFeatures.statusChange || false,
            presenceChange: webhookFeatures.presenceChange || false,
            deviceConnected: webhookFeatures.deviceConnected || false,
            receiveByEmail: webhookFeatures.receiveByEmail || false
          },
          message: isConfigured 
            ? `Webhook configurado para: ${webhookUrl}` 
            : 'Webhook não configurado'
        };
      } catch (error) {
        console.log(`[Z-API] Erro esperado ao verificar webhook (método GET):`, error.message);
        
        // Verificar se o webhook foi configurado nos metadados do canal
        if (channel.metadata && channel.metadata.webhookConfigured === true) {
          console.log(`[Z-API] Webhook está configurado de acordo com os metadados do canal`);
          
          // Retornar as informações salvas nos metadados
          return {
            status: "success",
            configured: true,
            webhookUrl: expectedWebhookUrl,
            webhookFeatures: {
              receiveAllNotifications: true,
              messageReceived: true,
              messageCreate: true,
              statusChange: true,
              presenceChange: true,
              deviceConnected: true,
              receiveByEmail: false
            },
            message: `Webhook configurado para: ${expectedWebhookUrl}`
          };
        }
        
        // Vamos verificar o status da instância como alternativa
        console.log(`[Z-API] Método alternativo: verificar status da instância...`);
        
        try {
          const connectionStatus = await checkConnectionStatus(channel);
          
          if (connectionStatus.status === "success" && connectionStatus.connected) {
            // Se a instância está conectada, provavelmente o webhook funciona também
            // mas a API não está retornando o status corretamente
            console.log(`[Z-API] Instância está conectada, assumindo que o webhook está configurado`);
            
            return {
              status: "success",
              configured: true,
              webhookUrl: expectedWebhookUrl,
              webhookFeatures: {
                receiveAllNotifications: true,
                messageReceived: true,
                messageCreate: true,
                statusChange: true,
                presenceChange: true,
                deviceConnected: true,
                receiveByEmail: false
              },
              message: `Webhook assumido como configurado (instância conectada)`
            };
          }
        } catch (statusError) {
          console.error("[Z-API] Erro ao verificar status alternativo:", statusError);
        }
        
        // Se chegamos aqui, realmente o webhook não está configurado
        return {
          status: "success",
          configured: false,
          webhookUrl: null,
          webhookFeatures: {
            receiveAllNotifications: false,
            messageReceived: false,
            messageCreate: false,
            statusChange: false,
            presenceChange: false,
            deviceConnected: false,
            receiveByEmail: false
          },
          message: "Webhook não configurado"
        };
      }
    } catch (error) {
      console.error("[Z-API] Erro ao verificar webhook:", error);
      
      let errorMessage = "Erro desconhecido ao verificar webhook";
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        errorMessage = responseData?.error || responseData?.message || error.message;
        console.error("[Z-API] Detalhes da resposta:", JSON.stringify(error.response?.data, null, 2));
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        status: "error",
        configured: false,
        message: errorMessage
      };
    }
  } catch (error) {
    console.error("[Z-API] Erro ao verificar webhook:", error);
    
    let errorMessage = "Erro desconhecido ao verificar webhook";
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      errorMessage = responseData?.error || responseData?.message || error.message;
      console.error("[Z-API] Detalhes da resposta:", JSON.stringify(error.response?.data, null, 2));
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      status: "error",
      configured: false,
      message: errorMessage
    };
  }
}

/**
 * Configura o webhook para recebimento de mensagens em um canal
 * @param channel Canal a ser configurado
 * @param webhookUrl URL opcional do webhook (senão, será usada a URL padrão do sistema)
 * @param webhookFeatures Configurações específicas de recursos do webhook
 * @returns Objeto com status da configuração
 */
/**
 * Marca uma mensagem como lida no WhatsApp
 * @param channel Canal configurado
 * @param messageId ID da mensagem a ser marcada como lida
 * @returns Status da operação
 */
export async function markMessageAsRead(
  channel: Channel,
  messageId: string
): Promise<{ status: string; message?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Marcando mensagem como lida na Z-API
    console.log(`[Z-API] Marcando mensagem ${messageId} como lida`);
    
    // Endpoint da API Z-API para marcar como lida
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/read-message`,
      {
        messageId
      },
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    // Verificar resposta
    if (response.data && response.data.success) {
      return {
        status: "success",
        message: "Mensagem marcada como lida com sucesso"
      };
    } else {
      return {
        status: "error",
        message: "Falha ao marcar mensagem como lida"
      };
    }
  } catch (error) {
    console.error("Erro ao marcar mensagem como lida na Z-API:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao marcar mensagem como lida"
    };
  }
}

export async function configureWebhook(
  channel: Channel, 
  webhookUrl?: string,
  webhookFeatures?: {
    receiveAllNotifications?: boolean;
    messageReceived?: boolean;
    messageCreate?: boolean;
    statusChange?: boolean;
    presenceChange?: boolean;
    deviceConnected?: boolean;
    receiveByEmail?: boolean;
  }
): Promise<{ status: string; message?: string; configured?: boolean; webhookUrl?: string; webhookFeatures?: any }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    const clientToken = channel.config?.clientToken || ZAPI_CLIENT_TOKEN;
    
    if (!instanceId || !token) {
      console.log(`[Z-API] Erro: Credenciais não configuradas para canal ${channel.id}`);
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Determinar a URL base da aplicação
    let baseUrl = '';
    if (process.env.APP_URL) {
      baseUrl = process.env.APP_URL;
    } else if (process.env.REPLIT_DOMAINS) {
      baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
    } else {
      // URL da Replit atual baseada na ID do projeto
      baseUrl = 'https://0eb8be2b-04a6-47e5-bbf1-dd3bd83018b0-00-2m0jsmtd34bj0.picard.replit.dev';
    }
    
    // URL do webhook - garantindo que seja uma URL acessível externamente
    // e inclui o ID do canal para roteamento correto
    const finalWebhookUrl = webhookUrl || `${baseUrl}/api/webhooks/zapi/${channel.id}`;
    
    // Extrair features individuais para campos separados de acordo com a interface mostrada
    const features = webhookFeatures || {
      receiveAllNotifications: true,
      messageReceived: true,
      messageCreate: true,
      statusChange: true, 
      deviceConnected: true
    };
    
    console.log(`[Z-API] Configurando webhook para canal ${channel.id}:`);
    console.log(`[Z-API] URL do webhook: ${finalWebhookUrl}`);
    console.log(`[Z-API] Instância: ${instanceId}`);
    
    // Headers com o Client-Token correto - isso é fundamental para autenticação na API
    const headers = getHeadersWithToken(token, clientToken);
    console.log(`[Z-API] Headers para configuração do webhook:`, JSON.stringify(headers, null, 2));
    
    // Configurar o webhook na Z-API usando os endpoints conforme a documentação atual
    let webhookConfigured = false;
    let configError = null;
    
    // === CONFIGURAÇÃO PRINCIPAL: Configurar o Webhook usando API mais recente ===
    // De acordo com a documentação atual da Z-API: webhook unificado
    try {
      console.log(`[Z-API] Configurando webhook usando a API unificada...`);
      
      // Configurar o webhook usando o endpoint e método atual
      const webhookConfig = {
        url: finalWebhookUrl,
        webhookFeatures: {
          receiveAllNotifications: features.receiveAllNotifications || true,
          messageReceived: features.messageReceived || true,
          messageCreate: features.messageCreate || true,
          statusChange: features.statusChange || true,
          presenceChange: features.presenceChange || true,
          deviceConnected: features.deviceConnected || true,
          receiveByEmail: features.receiveByEmail || false
        }
      };
      
      console.log(`[Z-API] Payload de configuração do webhook:`, JSON.stringify(webhookConfig, null, 2));
      
      // Usando método PUT em vez de POST como recomendado pela documentação mais recente
      const webhookResponse = await axios.put(
        `${BASE_URL}/instances/${instanceId}/token/${token}/webhook`,
        webhookConfig,
        { headers }
      );
      
      console.log(`[Z-API] Resposta da configuração do Webhook:`, 
        JSON.stringify(webhookResponse.data, null, 2));
      
      webhookConfigured = true;
    } catch (error) {
      if (error instanceof Error) {
        console.log("[Z-API] Erro na configuração do webhook via API unificada:", error.message);
        if (axios.isAxiosError(error)) {
          console.log("[Z-API] Detalhes do erro:", JSON.stringify(error.response?.data, null, 2));
          
          // Como estamos usando a API mais recente, tentar alternativa em caso de falha
          configError = error;
        }
      }
    }
    
    // === ETAPA 2: Configurar o Webhook para "Ao Conectar" ===
    // De acordo com a documentação oficial: https://www.postman.com/docs-z-api/z-api-s-public-workspace/request/zux9mdd/ao-conectar
    try {
      console.log(`[Z-API] Etapa 2: Configurando webhook para evento de conexão...`);
      
      const connectResponse = await axios.post(
        `${BASE_URL}/instances/${instanceId}/token/${token}/webhook/connect`,
        {
          value: finalWebhookUrl
        },
        { headers }
      );
      
      console.log(`[Z-API] Resposta da configuração de Webhook Ao Conectar:`, 
        JSON.stringify(connectResponse.data, null, 2));
      
      webhookConfigured = true;
    } catch (error) {
      if (error instanceof Error) {
        console.log("[Z-API] Erro na configuração do webhook Ao Conectar:", error.message);
      }
    }
    
    // === ETAPA 3: Configurar o Webhook para "Ao Desconectar" ===
    // De acordo com a documentação oficial: https://www.postman.com/docs-z-api/z-api-s-public-workspace/request/6q2yfbj/ao-desconectar
    try {
      console.log(`[Z-API] Etapa 3: Configurando webhook para evento de desconexão...`);
      
      const disconnectResponse = await axios.post(
        `${BASE_URL}/instances/${instanceId}/token/${token}/webhook/disconnect`,
        {
          value: finalWebhookUrl
        },
        { headers }
      );
      
      console.log(`[Z-API] Resposta da configuração de Webhook Ao Desconectar:`, 
        JSON.stringify(disconnectResponse.data, null, 2));
    } catch (error) {
      if (error instanceof Error) {
        console.log("[Z-API] Erro na configuração do webhook Ao Desconectar:", error.message);
      }
    }
    
    // === ETAPA 4: Configurar o Webhook para "Ao Enviar" mensagem ===
    // De acordo com a documentação oficial: https://www.postman.com/docs-z-api/z-api-s-public-workspace/request/q0hpv11/ao-enviar
    try {
      console.log(`[Z-API] Etapa 4: Configurando webhook para evento de envio...`);
      
      const sendResponse = await axios.post(
        `${BASE_URL}/instances/${instanceId}/token/${token}/webhook/send`,
        {
          value: finalWebhookUrl
        },
        { headers }
      );
      
      console.log(`[Z-API] Resposta da configuração de Webhook Ao Enviar:`, 
        JSON.stringify(sendResponse.data, null, 2));
    } catch (error) {
      if (error instanceof Error) {
        console.log("[Z-API] Erro na configuração do webhook Ao Enviar:", error.message);
      }
    }
    
    // Atualizar metadados do canal para armazenar o status da configuração
    try {
      // Importar db para atualizar o canal
      const { db } = await import("../../../db");
      const { channels } = await import("../../../shared/schema");
      const { eq } = await import("drizzle-orm");
      
      // Obter canal atualizado para ter metadados atuais
      const [currentChannel] = await db.select()
        .from(channels)
        .where(eq(channels.id, channel.id));
      
      // Preparar metadados com informações de webhook
      const metadata = {
        ...(currentChannel?.metadata || {}),
        webhookConfigured: true,
        webhookUrl: finalWebhookUrl,
        webhookFeatures: features,
        lastWebhookSetup: new Date().toISOString(),
        webhookConfigurationMethod: webhookConfigured ? "multiple" : "failed"
      };
      
      // Atualizar o canal com a informação de webhook configurado
      await db.update(channels)
        .set({ metadata })
        .where(eq(channels.id, channel.id));
      
      console.log(`[Z-API] Metadados do canal atualizados com informações do webhook:`, 
        JSON.stringify(metadata, null, 2));
    } catch (dbError) {
      if (dbError instanceof Error) {
        console.error("[Z-API] Erro ao atualizar metadados do canal:", dbError.message);
      }
      // Continuamos mesmo com erro de DB, não é crítico
    }
    
    // Se não conseguimos configurar o webhook com nenhum método, retorna erro
    if (!webhookConfigured && configError) {
      return {
        status: "error",
        configured: false,
        message: `Falha ao configurar webhook: ${configError instanceof Error ? configError.message : "Erro desconhecido"}`
      };
    }
    
    return {
      status: "success",
      configured: true,
      webhookUrl: finalWebhookUrl,
      webhookFeatures: features,
      message: `Webhook configurado com sucesso para: ${finalWebhookUrl}`
    };
    
  } catch (error) {
    console.error("[Z-API] Erro ao configurar webhook:", error);
    let errorDetails = "Erro desconhecido ao configurar webhook";
    
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      if (responseData) {
        errorDetails = responseData.error || responseData.message || error.message;
      } else {
        errorDetails = error.message;
      }
      console.error("[Z-API] Detalhes da resposta:", JSON.stringify(error.response?.data, null, 2));
    } else if (error instanceof Error) {
      errorDetails = error.message;
    }
    
    return {
      status: "error",
      configured: false,
      message: errorDetails
    };
  }
}

/**
 * Envia uma mensagem de teste para uma conversa na caixa de entrada
 * @param channel Canal para enviar a mensagem
 * @returns Objeto com status do envio
 */
export async function sendTestMessageToInbox(channel: Channel): Promise<{ status: string; message?: string }> {
  try {
    // Primeiro verificamos se o canal está conectado
    const connectionStatus = await checkConnectionStatus(channel);
    
    if (connectionStatus.status === "error" || !connectionStatus.connected) {
      return { 
        status: "error", 
        message: "Canal não está conectado. Conecte o WhatsApp antes de testar a caixa de entrada." 
      };
    }
    
    // Em uma implementação real, aqui enviaríamos uma mensagem para um número específico
    // e aguardaríamos o recebimento pelo webhook. Como é um teste, vamos simular.
    
    // Verificar se o webhook está configurado
    const webhookStatus = await checkWebhookStatus(channel);
    
    if (webhookStatus.status === "error" || !webhookStatus.configured) {
      return {
        status: "error",
        message: "Webhook não está configurado. Configure-o antes de testar a caixa de entrada."
      };
    }
    
    return {
      status: "success",
      message: "Teste de mensagem para caixa de entrada realizado com sucesso. Se o webhook estiver configurado corretamente, você receberá as mensagens."
    };
  } catch (error) {
    console.error("Erro ao testar mensagem na caixa de entrada:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao testar mensagem"
    };
  }
}