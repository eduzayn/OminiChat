// Rotas para integração com a Z-API
const express = require('express');
const { ZAPIClient, extractInstanceId } = require('../services/zapi');

const router = express.Router();

/**
 * Middleware para verificar autenticação
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: 'Não autenticado' });
}

/**
 * Middleware para verificar se o usuário é administrador
 */
function isAdmin(req, res, next) {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Acesso negado' });
}

/**
 * Registra rotas relacionadas à Z-API na aplicação
 * @param {express.Application} app - Instância do Express
 * @param {string} apiPrefix - Prefixo para as rotas da API
 */
function registerZAPIRoutes(app, apiPrefix) {
  // Diagnóstico de configuração da Z-API
  app.get(`${apiPrefix}/zapi/diagnostics`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const client = ZAPIClient.fromEnv();
      const diagnostics = client.getDiagnostics();
      
      // Adicionar diagnóstico de extração para URL crua
      const rawInstanceId = process.env.ZAPI_INSTANCE_ID || '';
      const extractedId = extractInstanceId(rawInstanceId);
      
      return res.json({
        success: true,
        diagnostics: {
          ...diagnostics,
          env_extraction_test: {
            raw_input: rawInstanceId,
            extracted_id: extractedId,
            is_valid_format: /^[A-F0-9]{32}$/i.test(extractedId)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao obter diagnósticos Z-API:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || {}
      });
    }
  });
  
  // Verificar status da conexão Z-API
  app.get(`${apiPrefix}/zapi/status`, isAuthenticated, async (req, res) => {
    try {
      const client = ZAPIClient.fromEnv();
      const status = await client.getStatus();
      
      return res.json({
        success: true,
        status
      });
    } catch (error) {
      console.error('Erro ao obter status da Z-API:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || {}
      });
    }
  });
  
  // Obter QR Code
  app.get(`${apiPrefix}/zapi/qrcode`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const client = ZAPIClient.fromEnv();
      const qrcode = await client.getQRCode();
      
      return res.json({
        success: true,
        qrcode
      });
    } catch (error) {
      console.error('Erro ao obter QR Code da Z-API:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || {}
      });
    }
  });
  
  // Reiniciar conexão
  app.post(`${apiPrefix}/zapi/restart`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const client = ZAPIClient.fromEnv();
      const result = await client.restart();
      
      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Erro ao reiniciar conexão Z-API:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || {}
      });
    }
  });
  
  // Endpoint para testar extração de ID da instância
  app.post(`${apiPrefix}/zapi/extract-id`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { input } = req.body;
      
      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'É necessário fornecer o input para extração'
        });
      }
      
      const extractedId = extractInstanceId(input);
      
      return res.json({
        success: true,
        raw_input: input,
        extracted_id: extractedId,
        is_valid_format: /^[A-F0-9]{32}$/i.test(extractedId)
      });
    } catch (error) {
      console.error('Erro ao extrair ID da instância:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Enviar mensagem de texto
  app.post(`${apiPrefix}/zapi/send-text`, isAuthenticated, async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({
          success: false,
          error: 'Telefone e mensagem são obrigatórios'
        });
      }
      
      const client = ZAPIClient.fromEnv();
      const result = await client.sendText(phone, message);
      
      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem via Z-API:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || {}
      });
    }
  });
  
  // Testar conexão com credenciais personalizadas
  app.post(`${apiPrefix}/zapi/test-connection`, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { instanceId, token } = req.body;
      
      if (!instanceId || !token) {
        return res.status(400).json({
          success: false,
          error: 'ID da instância e token são obrigatórios'
        });
      }
      
      const client = new ZAPIClient({ instanceId, token });
      
      // Primeiro obter diagnósticos
      const diagnostics = client.getDiagnostics();
      
      // Tentar obter status
      let status;
      let statusError = null;
      try {
        status = await client.getStatus();
      } catch (error) {
        statusError = {
          message: error.message,
          details: error.details || {}
        };
      }
      
      return res.json({
        success: !statusError,
        diagnostics,
        status: status || null,
        error: statusError
      });
    } catch (error) {
      console.error('Erro ao testar conexão Z-API:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || {}
      });
    }
  });
  
  return router;
}

module.exports = {
  registerZAPIRoutes
};