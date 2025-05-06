// Teste com os endpoints mais recentes conforme documentação da Z-API
import axios from 'axios';

async function testLatestAPIEndpoints() {
  try {
    // Credenciais da instância
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C248B72DA0842F47';
    
    console.log('🔍 Testando endpoints conforme documentação oficial de maio/2025');
    console.log(`Instância: ${instanceId}`);
    console.log(`Token: ${token.substring(0, 5)}...`);
    
    // De acordo com https://developer.z-api.io/instance/status
    // O endpoint correto para verificar status é GET /v2/status
    
    console.log('\n--- TESTE 1: Endpoint de Status (v2/status) ---');
    
    // Vamos tentar várias configurações para encontrar a correta
    const baseUrls = [
      'https://api.z-api.io', // Base sem instância
      `https://api.z-api.io/instances/${instanceId}`, // Base com instância no path
    ];
    
    const endpoints = [
      '/v2/status', // Conforme documentação
      '/status', // Formato alternativo
    ];
    
    // Cabeçalhos comuns
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token
    };
    
    for (const baseUrl of baseUrls) {
      for (const endpoint of endpoints) {
        const fullUrl = `${baseUrl}${endpoint}`;
        console.log(`\nTentando: ${fullUrl}`);
        
        try {
          const response = await axios.get(fullUrl, { headers });
          console.log(`Status HTTP: ${response.status}`);
          console.log('Resposta:', JSON.stringify(response.data, null, 2));
          
          if (!response.data.error) {
            console.log('✅ SUCESSO! Formato válido encontrado.');
            console.log(`URL que funciona: ${fullUrl}`);
          }
        } catch (error) {
          console.log(`❌ Erro: ${error.message}`);
          if (error.response) {
            console.log(`Status HTTP: ${error.response.status}`);
            console.log('Detalhes:', JSON.stringify(error.response.data, null, 2));
          }
        }
      }
    }
    
    // Teste o endpoint de restart também
    console.log('\n--- TESTE 2: Endpoint de Restart (v2/restart) ---');
    
    // De acordo com https://developer.z-api.io/instance/restart
    // O endpoint correto para restart é GET /v2/restart
    
    const restartEndpoints = [
      '/v2/restart', // Conforme documentação
      '/restart', // Formato alternativo
    ];
    
    for (const baseUrl of baseUrls) {
      for (const endpoint of restartEndpoints) {
        const fullUrl = `${baseUrl}${endpoint}`;
        console.log(`\nTentando: ${fullUrl}`);
        
        try {
          const response = await axios.get(fullUrl, { headers });
          console.log(`Status HTTP: ${response.status}`);
          console.log('Resposta:', JSON.stringify(response.data, null, 2));
          
          if (!response.data.error) {
            console.log('✅ SUCESSO! Formato válido encontrado.');
            console.log(`URL que funciona: ${fullUrl}`);
          }
        } catch (error) {
          console.log(`❌ Erro: ${error.message}`);
          if (error.response) {
            console.log(`Status HTTP: ${error.response.status}`);
            console.log('Detalhes:', JSON.stringify(error.response.data, null, 2));
          }
        }
      }
    }
    
    // Teste com padrão sem token nem instância no path (apenas no header)
    console.log('\n--- TESTE 3: Cabeçalhos com Instância e Token ---');
    
    const instanceHeaders = {
      'Content-Type': 'application/json',
      'Client-Token': token,
      'Instance-Id': instanceId
    };
    
    try {
      const noPathUrl = 'https://api.z-api.io/v2/status';
      console.log(`\nTentando: ${noPathUrl} com Instance-Id no cabeçalho`);
      
      const response = await axios.get(noPathUrl, { headers: instanceHeaders });
      console.log(`Status HTTP: ${response.status}`);
      console.log('Resposta:', JSON.stringify(response.data, null, 2));
      
      if (!response.data.error) {
        console.log('✅ SUCESSO! Formato válido encontrado.');
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
      if (error.response) {
        console.log(`Status HTTP: ${error.response.status}`);
        console.log('Detalhes:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Verificar também se precisamos usar um subdomínio específico com o ID da instância
    console.log('\n--- TESTE 4: Subdomínio com ID da Instância ---');
    
    try {
      const subdomainUrl = `https://${instanceId.toLowerCase()}.api.z-api.io/v2/status`;
      console.log(`\nTentando: ${subdomainUrl}`);
      
      const response = await axios.get(subdomainUrl, { headers });
      console.log(`Status HTTP: ${response.status}`);
      console.log('Resposta:', JSON.stringify(response.data, null, 2));
      
      if (!response.data.error) {
        console.log('✅ SUCESSO! Formato válido encontrado.');
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
      if (error.response) {
        console.log(`Status HTTP: ${error.response.status}`);
        console.log('Detalhes:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n=================================================');
    console.log('📋 CONCLUSÃO');
    console.log('=================================================');
    console.log('Se todos os testes falharam, isso confirma que:');
    console.log('1. As credenciais provavelmente estão inválidas ou expiradas');
    console.log('2. A instância pode não estar mais disponível ou ativa');
    
    console.log('\nPróximos passos recomendados:');
    console.log('1. Verifique no painel administrativo da Z-API se a instância está ativa');
    console.log('2. Gere novas credenciais para esta instância');
    console.log('3. Se disponível, tente usar outra instância com credenciais válidas');
  } catch (error) {
    console.error('Erro geral nos testes:', error);
  }
}

// Executar o teste
testLatestAPIEndpoints();