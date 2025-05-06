import { Request, Response } from 'express';
import { db } from '@db';
import { channels, Channel, ChannelConfig } from '@shared/schema';
import { ZAPIClient } from '../../services/channels/zapi';
import { eq } from 'drizzle-orm';

/**
 * Rota para verificar status de conectividade da Z-API com credenciais atuais
 * e fornecer diagnóstico detalhado de problemas
 */
export async function zapiStatusHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const channelId = parseInt(id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do canal inválido'
      });
    }
    
    // Obter informações do canal
    const channelData = await db.query.channels.findFirst({
      where: eq(channels.id, channelId)
    });
    
    if (!channelData) {
      return res.status(404).json({
        success: false,
        error: 'Canal não encontrado'
      });
    }
    
    // Verificar se é um canal de WhatsApp do tipo Z-API
    if (channelData.type !== 'whatsapp' || 
        (channelData.config as ChannelConfig)?.provider !== 'zapi') {
      return res.status(400).json({
        success: false,
        error: 'O canal não é um canal WhatsApp Z-API'
      });
    }
    
    // Extrair credenciais
    const config = channelData.config as ChannelConfig;
    const instanceId = config.instanceId;
    const token = config.token;
    
    if (!instanceId || !token) {
      return res.status(400).json({
        success: false, 
        error: 'Credenciais Z-API ausentes (instanceId, token)'
      });
    }
    
    // Criar cliente Z-API
    const zapiClient = new ZAPIClient(instanceId, token);
    
    // Verificar status
    const statusResponse = await zapiClient.getStatus();
    
    // Preparar objeto de resposta para diagnóstico
    const diagnosticInfo = {
      channel: {
        id: channelData.id,
        name: channelData.name,
        type: channelData.type,
        provider: (channelData.config as ChannelConfig)?.provider,
        createdAt: channelData.createdAt
      },
      instance: {
        instanceId: instanceId,
        baseUrl: `https://api.z-api.io/instances/${instanceId}`
      },
      status: {
        success: !statusResponse.error,
        connected: !!statusResponse.connected,
        data: statusResponse
      }
    };
    
    // Adicionar detalhes do QR Code se não estiver conectado e não tiver erro
    if (!statusResponse.connected && !statusResponse.error) {
      // Tentar obter o QR code
      console.log('[QRCode Handler] Status não conectado e sem erro, tentando obter QR code');
      const qrResponse = await zapiClient.getQRCode();
      
      diagnosticInfo.status.qrcode = {
        success: !qrResponse.error,
        data: qrResponse
      };
      
      if (qrResponse.qrcode) {
        diagnosticInfo.status.qrcode.value = qrResponse.qrcode;
      }
    } else if (statusResponse.error) {
      console.log(`[QRCode Handler] Erro ao verificar status: ${statusResponse.error}`);
    }
    
    return res.json(diagnosticInfo);
  } catch (error) {
    console.error('Erro ao verificar status Z-API:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar status',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * Rota para atualizar credenciais Z-API e verificar conectividade
 */
export async function updateZAPICredentialsHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { instanceId, token } = req.body;
    const channelId = parseInt(id);
    
    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do canal inválido'
      });
    }
    
    // Validar credenciais fornecidas
    if (!instanceId || !token) {
      return res.status(400).json({
        success: false,
        error: 'Credenciais incompletas. Forneça instanceId e token.'
      });
    }
    
    // Obter informações do canal
    const channelData = await db.query.channels.findFirst({
      where: eq(channels.id, channelId)
    });
    
    if (!channelData) {
      return res.status(404).json({
        success: false,
        error: 'Canal não encontrado'
      });
    }
    
    // Verificar se é um canal de WhatsApp Z-API
    if (channelData.type !== 'whatsapp' || 
        (channelData.config as ChannelConfig)?.provider !== 'zapi') {
      return res.status(400).json({
        success: false,
        error: 'O canal não é um canal WhatsApp Z-API'
      });
    }
    
    // Testar novas credenciais antes de salvar
    const zapiClient = new ZAPIClient(instanceId, token);
    const statusResponse = await zapiClient.getStatus();
    
    // Se a resposta contém um erro, retornar o erro para o cliente
    if (statusResponse.error) {
      return res.status(400).json({
        success: false,
        error: `Erro ao validar novas credenciais: ${statusResponse.error}`,
        details: statusResponse
      });
    }
    
    // Atualizar as credenciais no banco de dados
    const config = channelData.config as ChannelConfig;
    const updatedConfig = {
      ...config,
      instanceId,
      token,
      // Limpar erros anteriores
      setupError: undefined
    };
    
    // Atualizar o canal no banco de dados
    await db.update(channels)
      .set({
        config: updatedConfig as any
      })
      .where(eq(channels.id, channelId));
    
    // Obter QR code se o dispositivo não estiver conectado
    let qrCode = null;
    if (!statusResponse.connected) {
      const qrResponse = await zapiClient.getQRCode();
      if (!qrResponse.error && qrResponse.qrcode) {
        qrCode = qrResponse.qrcode;
      }
    }
    
    // Retornar resultado da atualização
    return res.json({
      success: true,
      message: 'Credenciais Z-API atualizadas com sucesso',
      connected: !!statusResponse.connected,
      qrCode: qrCode,
      status: statusResponse
    });
  } catch (error) {
    console.error('Erro ao atualizar credenciais Z-API:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar credenciais',
      details: error instanceof Error ? error.stack : undefined
    });
  }
}