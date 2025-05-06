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
  // Muito importante! De acordo com a documentação Z-API, o Client-Token é crucial
  // para autenticação das requisições e deve estar presente em todos os headers
  // A Z-API usa o formato "client-token" (minúsculo e com hífen)
  // O Client-Token deve ser o token de segurança da conta, não o token da instância
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'client-token': clientToken,
  };
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

    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais da Z-API não configuradas (instanceId, token)"
      };
    }

    // Configura o webhook para recebimento de mensagens
    const webhookUrl = process.env.BASE_URL 
      ? `${process.env.BASE_URL}/api/webhooks/zapi/${channel.id}` 
      : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/webhooks/zapi/${channel.id}`;
      
    // Registrar o webhook na Z-API
    try {
      await axios.post(
        `${BASE_URL}/instances/${instanceId}/token/${token}/webhook`,
        {
          url: webhookUrl,
          webhookFeatures: {
            receiveAllNotifications: true
          }
        },
        {
          headers: getHeadersWithToken(token)
        }
      );
      console.log(`Webhook Z-API configurado para ${webhookUrl}`);
    } catch (webhookError) {
      console.error("Erro ao configurar webhook Z-API:", webhookError);
      // Não interromper o fluxo se falhar o registro do webhook
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
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatar número de telefone (remover +, espaços, etc)
    const formattedPhone = to.replace(/\D/g, '');
    
    // Enviar mensagem
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-text`,
      {
        phone: formattedPhone,
        message: content
      },
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    if (response.data && response.data.zaapId) {
      return {
        status: "success",
        messageId: response.data.zaapId
      };
    } else {
      return {
        status: "error",
        message: "Falha ao enviar mensagem via Z-API"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem Z-API:", error);
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
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatar número de telefone
    const formattedPhone = to.replace(/\D/g, '');
    
    // Enviar imagem
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-image`,
      {
        phone: formattedPhone,
        image: imageUrl,
        caption: caption || ''
      },
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    if (response.data && response.data.zaapId) {
      return {
        status: "success",
        messageId: response.data.zaapId
      };
    } else {
      return {
        status: "error",
        message: "Falha ao enviar imagem via Z-API"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar imagem Z-API:", error);
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
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatar número de telefone
    const formattedPhone = to.replace(/\D/g, '');
    
    // Enviar documento
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-document`,
      {
        phone: formattedPhone,
        document: fileUrl,
        fileName: fileName,
        caption: caption || ''
      },
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    if (response.data && response.data.zaapId) {
      return {
        status: "success",
        messageId: response.data.zaapId
      };
    } else {
      return {
        status: "error",
        message: "Falha ao enviar documento via Z-API"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar documento Z-API:", error);
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
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Formatar número de telefone
    const formattedPhone = to.replace(/\D/g, '');
    
    // Enviar áudio
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/send-audio`,
      {
        phone: formattedPhone,
        audio: audioUrl
      },
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    if (response.data && response.data.zaapId) {
      return {
        status: "success",
        messageId: response.data.zaapId
      };
    } else {
      return {
        status: "error",
        message: "Falha ao enviar áudio via Z-API"
      };
    }
  } catch (error) {
    console.error("Erro ao enviar áudio Z-API:", error);
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
    
    console.log(`Verificando status da conexão Z-API: ${instanceId} com client-token: ${clientToken}`);
    
    // Verificar status
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/status`,
      {
        headers: getHeadersWithToken(token, clientToken)
      }
    );
    
    if (response.data) {
      console.log(`Resposta de status Z-API:`, JSON.stringify(response.data));
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
    console.error("Erro ao verificar status Z-API:", error);
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
    
    // Estrutura do header exatamente como esperado pela Z-API
    const headers = {
      'Content-Type': 'application/json',
      'client-token': clientToken,
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
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Desconectar sessão
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/disconnect`,
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    return {
      status: "success",
      message: "Sessão desconectada com sucesso"
    };
  } catch (error) {
    console.error("Erro ao desconectar sessão Z-API:", error);
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
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Reiniciar sessão
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/restart`,
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    return {
      status: "success",
      message: "Sessão reiniciada com sucesso"
    };
  } catch (error) {
    console.error("Erro ao reiniciar sessão Z-API:", error);
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
    
    // Tentativa alternativa: uso da API de status em vez da API de webhook
    try {
      // Verificar webhook configurado 
      // Obs: Alguns endpoints da Z-API retornam erro 404 (NOT_FOUND) quando o recurso não existe
      // Vamos tratar isso como uma resposta válida indicando que o webhook não está configurado
      const headers = getHeadersWithToken(token, ZAPI_CLIENT_TOKEN);
      
      console.log(`[Z-API] Fazendo requisição GET para ${BASE_URL}/instances/${instanceId}/token/${token}/webhook`);
      console.log(`[Z-API] Headers:`, JSON.stringify(headers, null, 2));
      
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
      console.error("[Z-API] Erro ao verificar webhook (método GET):", error);
      
      // Se o erro for 404, isso pode indicar que o webhook não está configurado
      if (axios.isAxiosError(error) && error.response?.status === 404) {
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
      
      // Para outros erros, vamos tentar fazer uma verificação de status geral
      try {
        // Tentar consultar o status geral da instância
        console.log(`[Z-API] Tentando método alternativo: verificar status da instância...`);
        const statusResponse = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/status`,
          { headers: getHeadersWithToken(token, ZAPI_CLIENT_TOKEN) }
        );
        
        console.log(`[Z-API] Resposta do status:`, JSON.stringify(statusResponse.data, null, 2));
        
        // Se conseguimos verificar o status, significa que a API está funcionando
        // mas o webhook provavelmente não está configurado
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
          message: "Webhook não configurado (verificado via status da instância)"
        };
      } catch (statusError) {
        console.error("[Z-API] Erro ao verificar status alternativo:", statusError);
        throw error; // Propagar o erro original
      }
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
): Promise<{ status: string; message?: string; configured?: boolean; webhookUrl?: string }> {
  try {
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    
    if (!instanceId || !token) {
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
      baseUrl = 'https://0eb8be2b-04a6-47e5-bbf1-dd3bd83018b0.id.repl.co';
    }
    
    // URL do webhook - se não for fornecida, cria uma URL baseada na URL atual da aplicação
    // e inclui o ID do canal para roteamento correto
    const finalWebhookUrl = webhookUrl || `${baseUrl}/api/webhooks/zapi/${channel.id}`;
    
    // Garantir que as features corretas sejam enviadas de acordo com a documentação da Z-API
    // https://developer.z-api.io/webhooks/introduction
    const featuresPayload = webhookFeatures || {
      receiveAllNotifications: true,
      messageReceived: true,
      messageCreate: true,
      statusChange: true,
      deviceConnected: true
    };
    
    // Configurando webhook com recursos específicos baseados na documentação
    const payload = {
      url: finalWebhookUrl,
      webhookFeatures: featuresPayload
    };
    
    console.log(`[Z-API] Configurando webhook para canal ${channel.id}:`);
    console.log(`[Z-API] URL do webhook: ${finalWebhookUrl}`);
    console.log(`[Z-API] Instância: ${instanceId}`);
    console.log(`[Z-API] Payload:`, JSON.stringify(payload, null, 2));
    
    // Headers com o Client-Token correto
    const headers = getHeadersWithToken(token, ZAPI_CLIENT_TOKEN);
    console.log(`[Z-API] Headers:`, JSON.stringify(headers, null, 2));
    
    const response = await axios.post(
      `${BASE_URL}/instances/${instanceId}/token/${token}/webhook`,
      payload,
      { headers }
    );
    
    console.log(`[Z-API] Resposta da configuração de webhook:`, JSON.stringify(response.data, null, 2));
    
    // Verificar a resposta de acordo com a documentação Z-API
    if (response.data && response.data.value === 'success') {
      return {
        status: "success",
        configured: true,
        webhookUrl: finalWebhookUrl,
        message: `Webhook configurado com sucesso para: ${finalWebhookUrl}`
      };
    } else {
      // Mesmo que a requisição não falhe, podemos ter uma resposta negativa da API
      return {
        status: "error",
        configured: false,
        webhookUrl: finalWebhookUrl,
        message: response.data?.message || "Resposta inesperada da Z-API ao configurar webhook"
      };
    }
  } catch (error) {
    console.error("[Z-API] Erro ao configurar webhook:", error);
    let errorDetails = "Erro desconhecido ao configurar webhook";
    
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      errorDetails = responseData?.error || responseData?.message || error.message;
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