import axios from 'axios';
import { Channel } from '@shared/schema';

/**
 * Serviço de integração com a Z-API (WhatsApp)
 * 
 * Implementa todas as funcionalidades da Z-API para envio e recebimento
 * de mensagens do WhatsApp.
 */

// Configuração global
const ZAPI_TOKEN = process.env.ZAPI_TOKEN;
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const BASE_URL = 'https://api.z-api.io';

// Z-API Security Token (Token de Segurança da conta, diferente do token da instância)
const ZAPI_SECURITY_TOKEN = "Fa427b12e188a433292a658fe45a07714S";

// Função de ajuda para garantir que incluímos sempre o Client-Token nos headers
function getHeadersWithToken(token: string) {
  // Muito importante! De acordo com a documentação Z-API, o Client-Token é crucial
  // para autenticação das requisições e deve estar presente em todos os headers
  // A Z-API usa o formato "client-token" (minúsculo e com hífen)
  // O Client-Token deve ser o token de segurança da conta, não o token da instância
  return {
    'client-token': ZAPI_SECURITY_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Configura o canal Z-API
 * @param channel Canal configurado no sistema
 * @returns Status da configuração com QR Code se necessário
 */
export async function setupZAPIChannel(channel: Channel): Promise<{ status: string; message?: string; qrCode?: string }> {
  try {
    // Verifica se as credenciais estão disponíveis
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;

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
          const headers = getHeadersWithToken(token);
          headers['Accept'] = 'image/png, application/json';
          
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
    if (!instanceId || !token) {
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    // Verificar status
    const response = await axios.get(
      `${BASE_URL}/instances/${instanceId}/token/${token}/status`,
      {
        headers: getHeadersWithToken(token)
      }
    );
    
    if (response.data) {
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
    // Usar credenciais do canal ou do ambiente
    const instanceId = channel.config?.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config?.token || ZAPI_TOKEN;
    
    if (!instanceId || !token) {
      console.error("Credenciais Z-API não configuradas");
      return {
        status: "error",
        message: "Credenciais Z-API não configuradas"
      };
    }
    
    console.log(`Verificando status da instância Z-API: ${instanceId}`);
    
    try {
       // Verificar status da conexão atual
      console.log(`Solicitando status da Z-API com instância: ${instanceId}, token: ${token}`);
      console.log(`Headers utilizados:`, JSON.stringify(getHeadersWithToken(token)));
      
      let statusResponse;
      
      try {
        statusResponse = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/status`,
          {
            headers: getHeadersWithToken(token)
          }
        );
        
        console.log(`Resposta de status recebida:`, statusResponse.status, JSON.stringify(statusResponse.data));
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`Erro detalhado na requisição de status:`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data ? JSON.stringify(error.response.data) : 'Sem dados',
            requestURL: error.config?.url,
            requestHeaders: error.config?.headers ? JSON.stringify(error.config.headers) : 'Sem headers'
          });
        } else {
          console.error(`Erro não-Axios ao obter status:`, error);
        }
        throw error;
      }
      
      // Se já estiver conectado, não precisa de QR code
      if (statusResponse && statusResponse.data && statusResponse.data.connected === true) {
        console.log(`Instância ${instanceId} já está conectada ao WhatsApp`);
        return {
          status: "connected",
          message: "WhatsApp já está conectado"
        };
      }
      
      console.log(`Instância ${instanceId} não está conectada, solicitando QR code via /qr-code/image`);
      
      try {
        console.log(`Requisitando QR code para instância ${instanceId} com token ${token}`);
        
        // Usando o endpoint /qr-code/image conforme documentação Z-API
        // Usando a função getHeadersWithToken para garantir o formato correto do cabeçalho
        const headers = getHeadersWithToken(token);
        headers['Accept'] = 'image/png, application/json';
        
        const qrResponse = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/qr-code/image`,
          { headers }
        );
        
        console.log("Resposta da API /qr-code/image recebida com status:", qrResponse.status);
        
        // Imprimir o tipo de dados recebido para diagnóstico
        if (qrResponse.data) {
          console.log("Tipo de dados recebido:", typeof qrResponse.data);
          if (typeof qrResponse.data === 'string') {
            console.log("Conteúdo da string (primeiros 100 chars):", qrResponse.data.substring(0, 100));
            console.log("Comprimento da string:", qrResponse.data.length);
          } else if (typeof qrResponse.data === 'object') {
            console.log("Propriedades do objeto:", Object.keys(qrResponse.data));
            console.log("Conteúdo completo:", JSON.stringify(qrResponse.data));
          } else {
            console.log("Formato desconhecido, conteúdo:", qrResponse.data);
          }
        } else {
          console.log("Nenhum dado recebido na resposta");
        }
        
        // Verificar se a resposta contém dados
        let qrCodeData = null;
        
        // A Z-API pode retornar o base64 diretamente ou encapsulado em um JSON.
        if (qrResponse.data) {
          if (typeof qrResponse.data === 'string' && qrResponse.data.startsWith('data:image')) {
            qrCodeData = qrResponse.data;
            console.log("QR Code encontrado como data URL completa");
          } else if (typeof qrResponse.data === 'string' && qrResponse.data.length > 100) {
            // Provável string base64 sem o prefixo
            qrCodeData = `data:image/png;base64,${qrResponse.data}`;
            console.log("QR Code encontrado como string base64 longa (adicionando prefixo)");
          } else if (typeof qrResponse.data === 'object') {
            if (qrResponse.data.qrcode) {
              qrCodeData = qrResponse.data.qrcode.startsWith('data:image') 
                ? qrResponse.data.qrcode 
                : `data:image/png;base64,${qrResponse.data.qrcode}`;
              console.log("QR Code encontrado na propriedade 'qrcode'");
            } else if (qrResponse.data.base64) {
              qrCodeData = qrResponse.data.base64.startsWith('data:image') 
                ? qrResponse.data.base64 
                : `data:image/png;base64,${qrResponse.data.base64}`;
              console.log("QR Code encontrado na propriedade 'base64'");
            } else if (qrResponse.data.value && typeof qrResponse.data.value === 'string') {
              qrCodeData = qrResponse.data.value.startsWith('data:image') 
                ? qrResponse.data.value 
                : `data:image/png;base64,${qrResponse.data.value}`;
              console.log("QR Code encontrado na propriedade 'value'");
            } else if (qrResponse.data.image) {
              qrCodeData = qrResponse.data.image.startsWith('data:image') 
                ? qrResponse.data.image 
                : `data:image/png;base64,${qrResponse.data.image}`;
              console.log("QR Code encontrado na propriedade 'image'");
            } else if (qrResponse.data.code) {
              qrCodeData = typeof qrResponse.data.code === 'string' && qrResponse.data.code.startsWith('data:image')
                ? qrResponse.data.code
                : `data:image/png;base64,${qrResponse.data.code}`;
              console.log("QR Code encontrado na propriedade 'code'");
            }
          }
        }
        
        if (qrCodeData) {
          console.log("QR code (base64) obtido com sucesso da Z-API via /qr-code/image");
          return {
            status: "waiting_scan",
            message: "Aguardando leitura do QR Code",
            qrCode: qrCodeData
          };
        }
        
        console.error("Resposta da Z-API (/qr-code/image) não contém QR code em formato reconhecível");
        
        // Tentar com endpoint alternativo /qr-code
        console.log("Tentando endpoint alternativo /qr-code");
        
        const qrResponseAlt = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/qr-code`,
          {
            headers: getHeadersWithToken(token)
          }
        );
        
        // Verificar se temos a imagem em base64 na resposta
        if (qrResponseAlt.data) {
          let qrCodeAltData = null;
          
          if (qrResponseAlt.data.base64) {
            qrCodeAltData = qrResponseAlt.data.base64;
          } else if (qrResponseAlt.data.qrcode) {
            qrCodeAltData = qrResponseAlt.data.qrcode;
          } else if (qrResponseAlt.data.value) {
            qrCodeAltData = qrResponseAlt.data.value;
          } else if (typeof qrResponseAlt.data === 'string' && qrResponseAlt.data.startsWith('data:image')) {
            qrCodeAltData = qrResponseAlt.data;
          } else if (qrResponseAlt.data.image) {
            qrCodeAltData = qrResponseAlt.data.image;
          }
          
          if (qrCodeAltData) {
            console.log("QR code obtido com sucesso via endpoint /qr-code");
            return {
              status: "waiting_scan",
              message: "Aguardando leitura do QR Code",
              qrCode: qrCodeAltData
            };
          }
        }
        
        // Se chegou aqui, tenta reiniciar a sessão
        console.log("Tentando gerar um novo QR code via restart da sessão");
        await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/restart`,
          {
            headers: getHeadersWithToken(token)
          }
        );
        
        // Aguardar um pouco para o QR code ser gerado
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Tentar novamente obter o QR code usando /qr-code/image
        const retryHeaders = getHeadersWithToken(token);
        retryHeaders['Accept'] = 'image/png, application/json';
        
        const retryQrResponse = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/qr-code/image`,
          { headers: retryHeaders }
        );
        
        // Verificar se a resposta contém dados
        let retryQrCodeData = null;
        
        if (retryQrResponse.data) {
          if (typeof retryQrResponse.data === 'string' && retryQrResponse.data.startsWith('data:image')) {
            retryQrCodeData = retryQrResponse.data;
          } else if (typeof retryQrResponse.data === 'string' && retryQrResponse.data.length > 100) {
            retryQrCodeData = `data:image/png;base64,${retryQrResponse.data}`;
          } else if (retryQrResponse.data.qrcode) {
            retryQrCodeData = retryQrResponse.data.qrcode.startsWith('data:image') 
              ? retryQrResponse.data.qrcode 
              : `data:image/png;base64,${retryQrResponse.data.qrcode}`;
          } else if (retryQrResponse.data.base64) {
            retryQrCodeData = retryQrResponse.data.base64.startsWith('data:image') 
              ? retryQrResponse.data.base64 
              : `data:image/png;base64,${retryQrResponse.data.base64}`;
          }
        }
        
        if (retryQrCodeData) {
          console.log("QR code obtido com sucesso após reiniciar sessão");
          return {
            status: "waiting_scan",
            message: "Aguardando leitura do QR Code",
            qrCode: retryQrCodeData
          };
        }
        
        return {
          status: "error",
          message: "QR Code não disponível no momento. Por favor, tente novamente mais tarde."
        };
      } catch (qrError: any) {
        console.error("Erro ao obter QR code da Z-API:", qrError.message);
        
        // Capturar detalhes do erro para retornar ao cliente
        const errorDetails = qrError.response?.data?.message || qrError.response?.data || qrError.message || "Erro desconhecido";
        
        return {
          status: "error",
          message: `Não foi possível obter o QR Code para conexão: ${errorDetails}`
        };
      }
    } catch (statusError: any) {
      console.error("Erro ao verificar status da instância Z-API:", statusError.message);
      return {
        status: "error",
        message: "Falha ao verificar status da instância Z-API"
      };
    }
  } catch (error: any) {
    console.error("Erro geral ao obter QR code Z-API:", error.message);
    return {
      status: "error",
      message: "Erro interno ao processar requisição de QR Code"
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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
    const instanceId = channel.config.instanceId || ZAPI_INSTANCE_ID;
    const token = channel.config.token || ZAPI_TOKEN;
    
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