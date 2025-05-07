import { type Express, Request, Response } from "express";
import { db } from "@db";
import { channels, Channel } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Middleware de autenticação
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Schema para validação do teste de mídia
const mediaTestSchema = z.object({
  to: z.string().min(8, "Número de telefone deve ter pelo menos 8 dígitos"),
  content: z.string().optional(),
  mediaUrl: z.string().url("URL de mídia deve ser válida"),
  mediaType: z.enum(["image", "audio", "video", "file"]),
  fileName: z.string().optional()
});

/**
 * Registra rotas de teste para envio de mídias via WhatsApp
 */
export function registerMediaTestRoutes(app: Express, apiPrefix: string) {
  
  // Rota para testar envio de mídia via WhatsApp
  app.post(`${apiPrefix}/channels/:id/media-test`, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const channelId = parseInt(req.params.id);
      
      // Validar dados da requisição
      const validation = mediaTestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          success: false,
          message: "Dados inválidos para teste de mídia", 
          errors: validation.error.format() 
        });
      }
      
      const { to, content, mediaUrl, mediaType, fileName } = validation.data;
      
      // Buscar canal pelo ID
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false,
          message: "Canal não encontrado" 
        });
      }
      
      // Verificar se é um canal do tipo WhatsApp
      if (channel.type !== "whatsapp") {
        return res.status(400).json({ 
          success: false,
          message: "Teste de mídia disponível apenas para canais WhatsApp" 
        });
      }
      
      // Verificar se é um canal Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        return res.status(400).json({ 
          success: false,
          message: "Teste de mídia disponível apenas para canais Z-API" 
        });
      }
      
      console.log(`[MediaTest] Testando envio de ${mediaType} para ${to} via canal ${channelId}`);
      console.log(`[MediaTest] URL: ${mediaUrl}`);
      
      // Importar serviço de WhatsApp para testar envio de mídia
      const whatsAppService = await import("../services/channels/whatsapp");
      
      // Enviar mídia via WhatsApp conforme o tipo
      const result = await whatsAppService.sendWhatsAppMessage(
        channel as Channel,
        to,
        content || `Teste de mídia ${mediaType}`,
        mediaType as any,
        mediaUrl,
        fileName
      );
      
      if (result.status === "success") {
        return res.status(200).json({
          success: true,
          message: `${mediaType} enviado com sucesso`,
          data: result
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Falha ao enviar ${mediaType}: ${result.message}`,
          error: result.message,
          data: result
        });
      }
    } catch (error) {
      console.error("Erro ao testar mídia:", error);
      return res.status(500).json({ 
        success: false,
        message: "Erro interno ao testar mídia",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota simples para verificar se o endpoint está funcionando
  app.get(`${apiPrefix}/video-test-status`, (req, res) => {
    console.log("Video test status endpoint hit");
    res.status(200).json({
      success: true,
      message: "Video test endpoint is working",
      timestamp: new Date().toISOString()
    });
  });
  
  // Rota para testar diretamente o envio de vídeo via Z-API sem autenticação
  app.post(`${apiPrefix}/zapi-send-video`, async (req, res) => {
    try {
      // Permitir CORS para testes
      res.header('Access-Control-Allow-Origin', '*');
      
      // Importar módulo axios se necessário
      const axios = require('axios');
      
      // Obter dados da requisição
      const { to, videoUrl, caption } = req.body;
      
      if (!to || !videoUrl) {
        return res.status(400).json({
          success: false,
          message: "Número de telefone (to) e URL do vídeo (videoUrl) são obrigatórios"
        });
      }
      
      // Obter credenciais do .env
      const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "3DF871A7ADFB20FB49998E66062CE0C1";
      const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "A4E42029C248B72DA0842F47";
      const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
      const BASE_URL = "https://api.z-api.io";
      
      console.log("[ZAPI-Video] Testando envio direto de vídeo");
      console.log(`[ZAPI-Video] Para: ${to}`);
      console.log(`[ZAPI-Video] URL do vídeo: ${videoUrl}`);
      console.log(`[ZAPI-Video] Legenda: ${caption || 'Sem legenda'}`);
      
      // Formatação do número do telefone
      let formattedPhone = to.replace(/\D/g, '');
      if (formattedPhone.length <= 11) {
        formattedPhone = `55${formattedPhone}`;
      }
      
      console.log(`[ZAPI-Video] Número formatado: ${formattedPhone}`);
      
      // Headers para a requisição
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (ZAPI_CLIENT_TOKEN) {
        headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
      }
      
      // Vamos tentar três abordagens diferentes
      let results = [];
      let success = false;
      
      // Tentativa 1: Usando campo 'linkVideo'
      try {
        console.log("[ZAPI-Video] Tentando primeira opção (linkVideo)...");
        const url1 = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-video`;
        
        const response1 = await axios.post(url1, {
          phone: formattedPhone,
          linkVideo: videoUrl,
          caption: caption || ''
        }, { headers });
        
        results.push({
          method: "linkVideo",
          success: true,
          data: response1.data
        });
        
        success = true;
      } catch (error1) {
        results.push({
          method: "linkVideo",
          success: false,
          error: error1.message,
          response: error1.response?.data
        });
      }
      
      // Tentativa 2: Usando campo 'video'
      if (!success) {
        try {
          console.log("[ZAPI-Video] Tentando segunda opção (video)...");
          const url2 = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-video`;
          
          const response2 = await axios.post(url2, {
            phone: formattedPhone,
            video: videoUrl,
            caption: caption || ''
          }, { headers });
          
          results.push({
            method: "video",
            success: true,
            data: response2.data
          });
          
          success = true;
        } catch (error2) {
          results.push({
            method: "video",
            success: false,
            error: error2.message,
            response: error2.response?.data
          });
        }
      }
      
      // Tentativa 3: Usando endpoint genérico send-media
      if (!success) {
        try {
          console.log("[ZAPI-Video] Tentando terceira opção (send-media)...");
          const url3 = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-media`;
          
          const response3 = await axios.post(url3, {
            phone: formattedPhone,
            url: videoUrl,
            type: 'video',
            caption: caption || ''
          }, { headers });
          
          results.push({
            method: "send-media",
            success: true,
            data: response3.data
          });
          
          success = true;
        } catch (error3) {
          results.push({
            method: "send-media",
            success: false,
            error: error3.message,
            response: error3.response?.data
          });
        }
      }
      
      return res.status(success ? 200 : 400).json({
        success: success,
        message: success ? "Vídeo enviado com sucesso" : "Falha ao enviar vídeo em todas as tentativas",
        results: results
      });
    } catch (error) {
      console.error("[ZAPI-Video] Erro geral:", error);
      
      return res.status(500).json({
        success: false,
        message: "Erro ao testar envio de vídeo",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Configuração CORS para a rota de envio de vídeo
  app.options(`${apiPrefix}/zapi-send-video`, (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).send('OK');
  });
  
  // Rota para testar diretamente a API Z-API sem autenticação
  app.get(`${apiPrefix}/zapi-direct-test`, async (req, res) => {
    try {
      // Importar módulo axios se necessário
      const axios = require('axios');
      
      // Obter credenciais do .env
      const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "3DF871A7ADFB20FB49998E66062CE0C1";
      const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "A4E42029C248B72DA0842F47";
      const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
      
      console.log("[ZAPI-Test] Fazendo chamada direta para Z-API");
      console.log(`[ZAPI-Test] Instance ID: ${ZAPI_INSTANCE_ID}`);
      console.log(`[ZAPI-Test] Token: ${ZAPI_TOKEN}`);
      console.log(`[ZAPI-Test] Client-Token disponível: ${ZAPI_CLIENT_TOKEN ? 'Sim' : 'Não'}`);
      
      // Fazer uma chamada simples de status para a Z-API
      const BASE_URL = "https://api.z-api.io";
      const url = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/status`;
      
      console.log(`[ZAPI-Test] URL: ${url}`);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (ZAPI_CLIENT_TOKEN) {
        headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
      }
      
      console.log(`[ZAPI-Test] Headers: ${JSON.stringify(headers)}`);
      
      const response = await axios.get(url, { headers });
      
      console.log(`[ZAPI-Test] Resposta: ${JSON.stringify(response.data)}`);
      
      return res.status(200).json({
        success: true,
        message: "Teste direto Z-API concluído com sucesso",
        data: response.data,
        zapi_credentials: {
          instance_id: ZAPI_INSTANCE_ID,
          token_prefixo: ZAPI_TOKEN ? ZAPI_TOKEN.substring(0, 4) + '...' : null,
          client_token_disponivel: !!ZAPI_CLIENT_TOKEN
        }
      });
    } catch (error) {
      console.error("[ZAPI-Test] Erro:", error);
      
      return res.status(500).json({
        success: false,
        message: "Erro ao testar Z-API diretamente",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Adicionando CORS específico para esta rota de teste
  app.options(`${apiPrefix}/channels/:id/video-test`, (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, api-key, Authorization');
    res.status(200).send('OK');
  });

  // Rota específica para teste de vídeo
  app.post(`${apiPrefix}/channels/:id/video-test`, async (req: Request, res: Response) => {
    // Permitir CORS para testes
    res.header('Access-Control-Allow-Origin', '*');
    
    // Verificação de autenticação simplificada para facilitar testes - USAR APENAS EM DESENVOLVIMENTO
    const apiKey = req.headers['api-key'] || req.query.apiKey;
    if (!req.session?.userId && (!apiKey || apiKey !== 'test-key-123')) {
      return res.status(401).json({
        success: false,
        message: "Não autenticado. Use uma sessão válida ou forneça o header 'api-key'"
      });
    }
    
    console.log("[VideoTest] Recebendo requisição de teste para envio de vídeo");
    try {
      const channelId = parseInt(req.params.id);
      
      // Obter dados da requisição
      const { to, videoUrl, caption } = req.body;
      
      if (!to || !videoUrl) {
        return res.status(400).json({
          success: false,
          message: "Número e URL do vídeo são obrigatórios"
        });
      }
      
      // Buscar canal pelo ID
      const channel = await db.query.channels.findFirst({
        where: eq(channels.id, channelId)
      });
      
      if (!channel) {
        return res.status(404).json({ 
          success: false,
          message: "Canal não encontrado" 
        });
      }
      
      // Verificar se é um canal Z-API
      if (!channel.config?.provider || channel.config.provider !== "zapi") {
        return res.status(400).json({ 
          success: false,
          message: "Teste de vídeo disponível apenas para canais Z-API" 
        });
      }
      
      console.log(`[VideoTest] Testando envio de vídeo para ${to} via canal ${channelId}`);
      console.log(`[VideoTest] URL: ${videoUrl}, Caption: ${caption || 'sem legenda'}`);
      
      // Importar Z-API diretamente para testar com mais detalhes
      const zapiService = await import("../services/channels/zapi");
      
      // Testar o envio do vídeo diretamente pela função específica
      const result = await zapiService.sendVideoMessage(
        channel as Channel,
        to,
        videoUrl,
        caption
      );
      
      return res.status(result.status === "success" ? 200 : 400).json({
        success: result.status === "success",
        message: result.status === "success" 
          ? "Vídeo enviado com sucesso" 
          : `Falha ao enviar vídeo: ${result.message}`,
        data: result
      });
    } catch (error) {
      console.error("Erro ao testar vídeo:", error);
      return res.status(500).json({ 
        success: false,
        message: "Erro interno ao testar vídeo",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}