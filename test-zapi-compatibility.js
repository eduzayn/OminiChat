// Script para testar a compatibilidade de diferentes versões da API Z-API
import axios from 'axios';

/**
 * Testa várias combinações de endpoints e tipos de autenticação
 * Este script ajuda a diagnosticar problemas com a API Z-API e identificar qual formato funciona
 */
async function testZAPICompatibility() {
  try {
    console.log('🔍 Iniciando teste de compatibilidade da Z-API');
    
    // Credenciais a serem testadas
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1'; // ID da instância padrão
    const token = 'A4E42029C24B872DA0842F47'; // Token padrão
    
    // Definir diferentes padrões de URL e autenticação
    const apiConfigurations = [
      // Formato com token no path (documentação Postman)
      { 
        baseUrl: `https://api.z-api.io/instances/${instanceId}/token/${token}`,
        useHeaderToken: false, 
        description: 'Token no path (formato padrão Postman)' 
      },
      
      // Formato alternativo com token no header
      { 
        baseUrl: `https://api.z-api.io/instances/${instanceId}`,
        useHeaderToken: true, 
        description: 'Token no header Client-Token' 
      },
      
      // Formato com prefixo /v2 no path
      { 
        baseUrl: `https://api.z-api.io/v2/instances/${instanceId}/token/${token}`,
        useHeaderToken: false, 
        description: 'Prefixo /v2, token no path' 
      },
      
      // Formato com token no header Authorization Bearer
      { 
        baseUrl: `https://api.z-api.io/instances/${instanceId}`,
        useHeaderToken: true,
        useBearer: true,
        description: 'Token no header Authorization Bearer' 
      },
      
      // Formato sem /instances no path
      { 
        baseUrl: `https://api.z-api.io/${instanceId}/token/${token}`,
        useHeaderToken: false, 
        description: 'URL simples sem /instances, token no path' 
      },
      
      // Formato com /api no path (mencionado em algumas documentações)
      { 
        baseUrl: `https://api.z-api.io/api/instances/${instanceId}/token/${token}`,
        useHeaderToken: false, 
        description: 'Prefixo /api, token no path' 
      },
      
      // Formato com domínio alternativo de sandbox (mencionado em algumas documentações)
      { 
        baseUrl: `https://sandbox.z-api.io/instances/${instanceId}/token/${token}`,
        useHeaderToken: false, 
        description: 'Domínio sandbox, token no path' 
      }
    ];
    
    // Definir endpoints a testar para cada configuração
    const endpoints = [
      { path: '/status', description: 'Estado da conexão' },
      { path: '/connection', description: 'Conexão (alternativo)' },
      { path: '/qr-code', description: 'QR Code formato 1' },
      { path: '/qrcode', description: 'QR Code formato 2' },
      { path: '/device', description: 'Informações do dispositivo' },
      { path: '/webhook', description: 'URL do webhook' }
    ];
    
    let successCount = 0;
    const results = [];
    
    // Testar cada combinação de configuração + endpoint
    for (const config of apiConfigurations) {
      console.log(`\n🔍 Testando configuração: ${config.description}`);
      console.log(`URL Base: ${config.baseUrl}`);
      
      for (const endpoint of endpoints) {
        const url = `${config.baseUrl}${endpoint.path}`;
        
        // Preparar cabeçalhos conforme configuração
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (config.useHeaderToken) {
          if (config.useBearer) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`> Authorization: Bearer ${token.substring(0, 5)}... (cabeçalho)`);
          } else {
            headers['Client-Token'] = token;
            console.log(`> Client-Token: ${token.substring(0, 5)}... (cabeçalho)`);
          }
        }
        
        try {
          console.log(`\n📡 Testando: ${endpoint.description} (${endpoint.path})`);
          console.log(`GET ${url}`);
          
          const response = await axios.get(url, { headers });
          
          console.log(`✅ Resposta HTTP ${response.status} obtida com sucesso!`);
          
          // Analisar resultado
          const result = {
            config: config.description,
            endpoint: endpoint.description,
            path: endpoint.path,
            status: response.status,
            success: true,
            error: null,
            data: response.data
          };
          
          // Verificar se a resposta contém erro
          if (response.data && response.data.error) {
            console.log(`⚠️ Resposta contém erro: ${response.data.error}`);
            result.success = false;
            result.error = response.data.error;
          } else {
            successCount++;
            console.log(`🎉 Endpoint funcional!`);
            
            // Mostrar informações importantes da resposta
            if (endpoint.path.includes('qr') && response.data.qrcode) {
              console.log(`📱 QR code obtido! (primeiros 50 caracteres): ${response.data.qrcode.substring(0, 50)}...`);
            } else if (response.data.connected === true) {
              console.log(`📲 Dispositivo já está conectado!`);
            } else {
              console.log(`📄 Dados da resposta: ${JSON.stringify(response.data).substring(0, 100)}...`);
            }
          }
          
          results.push(result);
        } catch (error) {
          console.log(`❌ Erro: ${error.message}`);
          
          const result = {
            config: config.description,
            endpoint: endpoint.description,
            path: endpoint.path,
            success: false,
            error: error.message
          };
          
          // Adicionar detalhes da resposta se disponíveis
          if (error.response) {
            result.status = error.response.status;
            result.data = error.response.data;
            console.log(`Detalhes: Status ${error.response.status}, Dados: ${JSON.stringify(error.response.data || {}).substring(0, 100)}...`);
          }
          
          results.push(result);
        }
      }
    }
    
    // Relatório final
    console.log('\n\n=================================================');
    console.log(`📊 RELATÓRIO DE COMPATIBILIDADE Z-API`);
    console.log('=================================================');
    console.log(`Total de testes: ${apiConfigurations.length * endpoints.length}`);
    console.log(`Testes bem-sucedidos: ${successCount}`);
    console.log(`Taxa de sucesso: ${(successCount / (apiConfigurations.length * endpoints.length) * 100).toFixed(2)}%`);
    
    // Detectar padrões
    const instanceNotFoundErrors = results.filter(r => 
      r.error === 'Instance not found' || 
      (r.data && r.data.error === 'Instance not found')
    );
    
    const notFoundErrors = results.filter(r => 
      r.error && r.error.includes('NOT_FOUND') || 
      (r.data && r.data.error && r.data.error.includes('NOT_FOUND'))
    );
    
    const authErrors = results.filter(r => 
      r.error && (r.error.includes('token') || r.error.includes('Token') || r.error.includes('auth')) || 
      (r.data && r.data.error && (r.data.error.includes('token') || r.data.error.includes('Token') || r.data.error.includes('auth')))
    );
    
    if (instanceNotFoundErrors.length > 5) {
      console.log('\n⚠️ DIAGNÓSTICO: ID DA INSTÂNCIA INVÁLIDO');
      console.log('O ID da instância fornecido não foi encontrado nos servidores da Z-API.');
      console.log('Verifique se o instanceId está correto no painel da Z-API.');
    } else if (authErrors.length > 5) {
      console.log('\n⚠️ DIAGNÓSTICO: ERRO DE AUTENTICAÇÃO / TOKEN');
      console.log('Detectados muitos erros relacionados à autenticação ou token inválido.');
      console.log('Verifique se o token está correto e não expirou.');
    } else if (notFoundErrors.length > 10) {
      console.log('\n⚠️ DIAGNÓSTICO: INCOMPATIBILIDADE DE API');
      console.log('Muitos endpoints retornaram NOT_FOUND, indicando que a estrutura da API mudou.');
      console.log('Verifique a documentação atual da Z-API para encontrar os endpoints corretos.');
    } else if (successCount === 0) {
      console.log('\n⚠️ DIAGNÓSTICO: FALHA TOTAL DE CONECTIVIDADE');
      console.log('Nenhuma requisição foi bem-sucedida. Possíveis problemas:');
      console.log('1. Serviço Z-API indisponível');
      console.log('2. Credenciais completamente inválidas');
      console.log('3. Problema de conectividade de rede');
    } else if (successCount < 3) {
      console.log('\n🔍 DIAGNÓSTICO: COMPATIBILIDADE LIMITADA');
      console.log('Poucos endpoints foram bem-sucedidos. Detalhes dos endpoints funcionais:');
      
      results.filter(r => r.success).forEach(r => {
        console.log(`- Configuração: ${r.config}`);
        console.log(`  Endpoint: ${r.endpoint} (${r.path})`);
      });
    } else {
      console.log('\n✅ DIAGNÓSTICO: ALGUNS ENDPOINTS FUNCIONAM');
      console.log('Vários endpoints retornaram respostas bem-sucedidas. Use estas configurações:');
      
      // Agrupar resultados bem-sucedidos por configuração
      const successByConfig = {};
      results.filter(r => r.success).forEach(r => {
        if (!successByConfig[r.config]) {
          successByConfig[r.config] = [];
        }
        successByConfig[r.config].push(r.endpoint);
      });
      
      // Mostrar apenas as configurações com mais endpoints funcionais
      Object.entries(successByConfig)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 2)
        .forEach(([config, endpoints]) => {
          console.log(`\n- Usar configuração: ${config}`);
          console.log(`  Endpoints funcionais: ${endpoints.join(', ')}`);
        });
    }
    
    return results;
  } catch (error) {
    console.error('Erro geral na execução do teste:', error);
    return { error: error.message };
  }
}

// Executar o teste
testZAPICompatibility()
  .then(results => {
    console.log('\nTeste concluído!');
    
    // Armazenar resultados detalhados em um arquivo (opcional)
    if (typeof window === 'undefined') {
      const fs = require('fs');
      fs.writeFileSync('zapi-compatibility-results.json', JSON.stringify(results, null, 2));
      console.log('\nResultados detalhados salvos em zapi-compatibility-results.json');
    }
  })
  .catch(err => {
    console.error('Erro ao executar teste:', err);
  });