// Script para testar diferentes formatos de URL da Z-API
import axios from 'axios';

async function testZAPIEndpoint(urlFormat, instanceId, token, endpoint) {
  try {
    let url;
    
    // Testar vários formatos de URL
    switch (urlFormat) {
      case 'standard':
        url = `https://api.z-api.io/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'v2':
        url = `https://api.z-api.io/v2/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'api-v2':
        url = `https://api.z-api.io/api/v2/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'v3':
        url = `https://api.z-api.io/v3/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'api-v3':
        url = `https://api.z-api.io/api/v3/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'v4':
        url = `https://api.z-api.io/v4/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'no-instances':
        url = `https://api.z-api.io/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'alt-domain':
        url = `https://z-api.io/api/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'api-path':
        url = `https://api.z-api.io/api/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'whatsapp-path':
        url = `https://api.z-api.io/whatsapp/instances/${instanceId}/token/${token}${endpoint}`;
        break;
      case 'simple-path':
        url = `https://api.z-api.io/instances/${instanceId}${endpoint}`;
        break;
      case 'header-token':
        url = `https://api.z-api.io/instances/${instanceId}${endpoint}`;
        // Usar o token como header
        break;
    }
    
    console.log(`\n=== Testando formato "${urlFormat}" com endpoint "${endpoint}" ===`);
    console.log(`URL: ${url}`);
    
    const options = {};
    if (urlFormat === 'header-token') {
      options.headers = {
        'Content-Type': 'application/json',
        'Client-Token': token
      };
    }
    
    const response = await axios.get(url, options);
    
    console.log('Status: OK, código', response.status);
    console.log('Resposta:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    
    return {
      success: true,
      url,
      data: response.data
    };
  } catch (error) {
    console.log('Status: ERRO', error.message);
    if (error.response) {
      console.log('HTTP status:', error.response.status);
      console.log('Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
    
    return {
      success: false,
      url,  // Usando shorthand para corrigir o erro
      error: error.message,
      details: error.response?.data
    };
  }
}

async function runTests() {
  const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
  const token = 'A4E42029C24B872DA0842F47';
  
  // Endpoints que parecem existir ou que são comumente usados em APIs de QR code
  const endpoints = [
    '/qr-code',
    '/status',
    '/connection',
    '/qrcode',
    '/session',
    // Adicionar endpoints sem barra inicial para algumas variações
    'qrcode',
    'status'
  ];
  
  // Novos formatos de URL para testar, incluindo caminhos diferentes e domínios alternativos
  const urlFormats = [
    'standard',
    'v2',
    'v3',
    'api-v2',
    'api-v3',
    'no-instances',
    'simple-path',
    'header-token',
    // Vamos adicionar algumas variações adicionais comuns em APIs modernas
    'api-path',
    'whatsapp-path',
    'v4',
    'alt-domain'
  ];
  
  const successfulTests = [];
  
  for (const endpoint of endpoints) {
    for (const format of urlFormats) {
      try {
        const result = await testZAPIEndpoint(format, instanceId, token, endpoint);
        
        // Verificar se foi um sucesso (não tem erro "NOT_FOUND" ou "Instance not found")
        const hasNotFoundError = 
          result.data?.error === 'NOT_FOUND' || 
          (result.details?.error && result.details.error.includes('not found'));
        
        if (result.success && !hasNotFoundError) {
          console.log(`✅ SUCESSO: Formato "${format}" com endpoint "${endpoint}"`);
          successfulTests.push({format, endpoint, url: result.url});
        }
      } catch (error) {
        console.error(`Erro durante teste de ${format} + ${endpoint}:`, error.message);
      }
    }
  }
  
  console.log('\n\n=== RESUMO DOS TESTES ===');
  if (successfulTests.length > 0) {
    console.log('Testes bem-sucedidos:');
    successfulTests.forEach((test, index) => {
      console.log(`${index + 1}. Formato: ${test.format}, Endpoint: ${test.endpoint}`);
      console.log(`   URL: ${test.url}`);
    });
  } else {
    console.log('Nenhum teste foi bem-sucedido.');
    console.log('Possíveis causas:');
    console.log('1. Credenciais inválidas (instanceId ou token incorretos)')
    console.log('2. Mudança na API da Z-API (novos endpoints ou formatos)')
    console.log('3. Restrições de acesso (bloqueio de IP, limitação de taxa)')
  }
}

// Executar os testes
runTests();