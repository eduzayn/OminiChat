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
          headers: {
            'Client-Token': token,
            'Content-Type': 'application/json'
          }
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
          headers: {
            'Client-Token': token,
            'Content-Type': 'application/json'
          }
        }
      );

      // Se o status indicar que não está conectado, gera QR Code
      if (statusResponse.data && statusResponse.data.connected === false) {
        // Gera QR Code
        const qrResponse = await axios.get(
          `${BASE_URL}/instances/${instanceId}/token/${token}/qr-code/image`,
          {
            headers: {
              'Client-Token': token,
              'Content-Type': 'application/json'
            }
          }
        );

        if (qrResponse.data && qrResponse.data.base64) {
          return {
            status: "pending",
            message: "Escaneie o QR Code com o WhatsApp para conectar",
            qrCode: qrResponse.data.base64
          };
        } else {
          return {
            status: "error",
            message: "Falha ao gerar QR Code para conexão"
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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
        headers: {
          'Client-Token': token,
          'Content-Type': 'application/json'
        }
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