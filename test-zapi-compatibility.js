// Script para testar várias combinações de endpoints e tipos de autenticação
import axios from 'axios';

/**
 * Testa várias combinações de endpoints e tipos de autenticação
 * Este script ajuda a diagnosticar problemas com a API Z-API e identificar qual formato funciona
 */
async function testZAPICompatibility() {
  try {
    // Credenciais exatas da imagem
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C248B72DA0842F47';
    
    console.log('🔍 Testando compatibilidade da Z-API com todas as combinações possíveis');
    
    // Configurações de teste
    const baseUrls = [
      `https://api.z-api.io/instances/${instanceId}`, // Formato padrão
      `https://api.z-api.io/v2/instances/${instanceId}`, // Com prefixo v2
      `https://api.z-api.io/instances/${instanceId}/token/${token}`, // Token no path
      `https://api.z-api.io`, // Base sem instância (talvez precisamos passar como header)
      `https://api.z-api.io/v2` // Base v2 sem instância
    ];
    
    const endpoints = [
      '/qr-code', // Formato padrão
      '/qrcode', // Alternativa sem hífen
      '/v2/qr-code', // Endpoint completo como na documentação
      '/v2/qrcode' // Variação sem hífen
    ];
    
    const headerCombinations = [
      { // 1. Client-Token
        'Content-Type': 'application/json',
        'Client-Token': token
      },
      { // 2. Authorization Bearer
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      { // 3. Instance ID e Client-Token
        'Content-Type': 'application/json',
        'Instance-Id': instanceId,
        'Client-Token': token
      },
      { // 4. X-API-TOKEN
        'Content-Type': 'application/json',
        'X-API-TOKEN': token
      },
      { // 5. API-KEY
        'Content-Type': 'application/json',
        'API-KEY': token
      },
      { // 6. Sem headers de autenticação, apenas Content-Type
        'Content-Type': 'application/json'
      }
    ];
    
    // Teste específico seguindo a documentação oficial
    console.log('\n--- Testando seguindo a documentação oficial ---');
    try {
      // Conforme a documentação em https://developer.z-api.io/instance/qrcode
      const docsUrl = 'https://api.z-api.io/v2/qr-code';
      console.log(`Chamando ${docsUrl} com Client-Token no header`);
      
      const authHeaders = {
        'Content-Type': 'application/json',
        'Client-Token': token
      };
      
      const docsResponse = await axios.get(docsUrl, { headers: authHeaders });
      console.log(`Status HTTP: ${docsResponse.status}`);
      console.log(`Resposta:`, JSON.stringify(docsResponse.data, null, 2).substring(0, 200));
      
      if (docsResponse.data && docsResponse.data.qrcode) {
        console.log('✅ QR code obtido seguindo a documentação oficial!');
        console.log(`Código (primeiros 50 caracteres): ${docsResponse.data.qrcode.substring(0, 50)}...`);
      } else if (docsResponse.data && docsResponse.data.error) {
        console.log(`❌ Erro na resposta: ${docsResponse.data.error}`);
        if (docsResponse.data.message) {
          console.log(`Mensagem: ${docsResponse.data.message}`);
        }
      }
    } catch (error) {
      console.log('❌ Erro seguindo a documentação oficial:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Teste com token no header e o endpoint exato da imagem
    console.log('\n--- Testando com o endpoint exato visto na imagem do painel ---');
    try {
      // URL completa exata da imagem
      const exactUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
      console.log(`URL da imagem: ${exactUrl}`);
      
      // Extrair domínio e path
      const urlParts = exactUrl.match(/^(https?:\/\/[^\/]+)\/(.*)$/);
      const baseDomain = urlParts ? urlParts[1] : null;
      const fullPath = urlParts ? urlParts[2] : null;
      
      if (baseDomain && fullPath) {
        console.log(`Domínio base: ${baseDomain}`);
        console.log(`Caminho completo: ${fullPath}`);
        
        // Teste 1: Token no header, usando path até instances
        const instancePath = fullPath.match(/^instances\/([^\/]+)/);
        if (instancePath) {
          const headerUrl = `${baseDomain}/instances/${instancePath[1]}/status`;
          console.log(`\nTeste com token no header: ${headerUrl}`);
          
          const headerResponse = await axios.get(headerUrl, {
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': token
            }
          });
          
          console.log(`Status HTTP: ${headerResponse.status}`);
          console.log(`Resposta:`, JSON.stringify(headerResponse.data, null, 2));
        }
        
        // Teste 2: Token diretamente no path (exato como na imagem)
        const pathUrl = `${baseDomain}/${fullPath.replace('/send-text', '/status')}`;
        console.log(`\nTeste com token no path: ${pathUrl}`);
        
        const pathResponse = await axios.get(pathUrl);
        console.log(`Status HTTP: ${pathResponse.status}`);
        console.log(`Resposta:`, JSON.stringify(pathResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Erro testando URL da imagem:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Testar uma matriz de combinações
    const results = [];
    let successCount = 0;
    
    console.log('\n--- Testando matriz de combinações ---');
    for (const baseUrl of baseUrls) {
      for (const endpoint of endpoints) {
        for (const [index, headers] of headerCombinations.entries()) {
          try {
            const fullUrl = baseUrl + endpoint;
            const headerDesc = `Headers #${index + 1}`;
            
            console.log(`Testando: ${fullUrl} com ${headerDesc}`);
            const response = await axios.get(fullUrl, { headers });
            
            const result = {
              url: fullUrl,
              headers: headerDesc,
              status: response.status,
              success: false,
              error: null,
              hasQrCode: false
            };
            
            if (response.data && response.data.qrcode) {
              result.success = true;
              result.hasQrCode = true;
              successCount++;
              console.log('✅ Sucesso! QR code encontrado');
            } else if (response.data && response.data.error) {
              result.error = response.data.error;
              console.log(`❌ Erro: ${response.data.error}`);
            } else {
              result.error = 'Resposta sem QR code';
              console.log(`❓ Resposta sem erro, mas sem QR code`);
            }
            
            results.push(result);
          } catch (error) {
            const errorResult = {
              url: baseUrl + endpoint,
              headers: `Headers #${index + 1}`,
              status: error.response ? error.response.status : 'N/A',
              success: false,
              error: error.message
            };
            results.push(errorResult);
            console.log(`❌ Erro: ${error.message}`);
          }
        }
      }
    }
    
    // Sumário dos resultados
    console.log('\n=================================================');
    console.log(`📊 RESUMO: ${successCount} combinações bem-sucedidas de ${results.length} testadas`);
    console.log('=================================================');
    
    if (successCount > 0) {
      console.log('Combinações bem-sucedidas:');
      results.filter(r => r.success).forEach(r => {
        console.log(`✅ ${r.url} com ${r.headers}`);
      });
    } else {
      console.log('❌ Nenhuma combinação retornou QR code com sucesso.');
      console.log('\nErros mais comuns:');
      
      const errorCounts = {};
      results.forEach(r => {
        if (r.error) {
          errorCounts[r.error] = (errorCounts[r.error] || 0) + 1;
        }
      });
      
      Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([error, count]) => {
          console.log(`- "${error}": ${count} ocorrências`);
        });
    }
    
    // Diagnóstico
    console.log('\n=================================================');
    console.log('📋 DIAGNÓSTICO');
    console.log('=================================================');
    
    if (successCount === 0) {
      // Se todas as tentativas falharam, algo está errado com as credenciais
      console.log('❌ PROBLEMA: Nenhuma combinação funcionou');
      console.log('\nPossíveis causas:');
      console.log('1. As credenciais fornecidas podem estar inválidas ou expiradas');
      console.log('2. A Z-API pode ter alterado significativamente seu formato de API');
      console.log('3. A instância Z-API pode estar desconectada ou indisponível');
      console.log('4. Pode haver bloqueio de rede ou problemas de conectividade');
      
      // Verificar os padrões de erro para diagnóstico mais específico
      const notFoundCount = results.filter(r => r.error && r.error.includes('NOT_FOUND')).length;
      const clientTokenCount = results.filter(r => r.error && r.error.includes('Client-Token is required')).length;
      
      if (notFoundCount > (results.length / 2)) {
        console.log('\n🔍 DIAGNÓSTICO ESPECÍFICO: Maioria dos erros é "NOT_FOUND"');
        console.log('Isso geralmente indica que:');
        console.log('- O ID da instância pode estar incorreto ou a instância não existe mais');
        console.log('- A estrutura da API mudou e estamos usando endpoints incorretos');
        console.log('- A instância pode ter sido migrada para uma nova versão da API');
      } else if (clientTokenCount > (results.length / 2)) {
        console.log('\n🔍 DIAGNÓSTICO ESPECÍFICO: Maioria dos erros é "Client-Token is required"');
        console.log('Isso geralmente indica que:');
        console.log('- Estamos usando o token no lugar errado (deve estar no cabeçalho para muitos endpoints)');
        console.log('- A autenticação mudou e precisa ser ajustada');
      }
      
      console.log('\nRECOMENDAÇÕES:');
      console.log('1. Verificar no painel da Z-API se as credenciais estão corretas e atualizadas');
      console.log('2. Considerar obter novas credenciais da Z-API');
      console.log('3. Consultar a documentação mais recente da Z-API');
      console.log('4. Verificar status do serviço Z-API');
    } else {
      // Se algumas combinações funcionaram
      console.log('✅ SUCESSO: Algumas combinações funcionaram');
      console.log('\nRECOMENDAÇÕES:');
      console.log('1. Atualizar o código para usar o formato que funcionou');
      console.log('2. Implementar mecanismo de fallback para testar diferentes formatos');
    }
  } catch (error) {
    console.error('Erro geral nos testes:', error);
  }
}

// Executar o teste
testZAPICompatibility();