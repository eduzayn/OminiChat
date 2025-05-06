// Teste específico baseado na documentação v2 mais recente da Z-API
import axios from 'axios';

async function testQRCodeV2API() {
  try {
    // Credenciais
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C248B72DA0842F47';
    
    console.log('🔍 Testando API conforme documentação em https://developer.z-api.io/instance/qrcode');
    
    // De acordo com a documentação oficial, a URL deve ser:
    // GET /v2/qr-code
    const url = 'https://api.z-api.io/v2/qr-code';
    
    // Os cabeçalhos devem incluir:
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token
    };
    
    console.log(`\nEndpoint: ${url}`);
    console.log(`Headers: Client-Token: ${token.substring(0, 5)}...`);
    
    try {
      console.log('\nFazendo solicitação...');
      const response = await axios.get(url, { headers });
      
      console.log(`Status HTTP: ${response.status}`);
      console.log(`Resposta:`, JSON.stringify(response.data, null, 2));
      
      // Verificar se temos um QR code na resposta
      if (response.data && response.data.qrcode) {
        console.log('\n✅ QR CODE OBTIDO COM SUCESSO!');
        console.log(`QR Code (primeiros 50 caracteres): ${response.data.qrcode.substring(0, 50)}...`);
      } else if (response.data && response.data.error) {
        console.log(`\n❌ Erro retornado pela API: ${response.data.error}`);
        if (response.data.message) {
          console.log(`Mensagem de erro: ${response.data.message}`);
        }
      } else {
        console.log('\n❓ Resposta sem QR code e sem mensagem de erro clara');
      }
    } catch (error) {
      console.log(`\n❌ Erro na solicitação: ${error.message}`);
      if (error.response) {
        console.log(`Status HTTP: ${error.response.status}`);
        console.log(`Resposta:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Testar também com a instância no path, já que estamos usando um ID específico
    const url2 = `https://api.z-api.io/v2/instances/${instanceId}/qr-code`;
    
    console.log(`\n\n--- Tentativa alternativa: incluindo ID da instância no path ---`);
    console.log(`Endpoint: ${url2}`);
    
    try {
      console.log('\nFazendo solicitação...');
      const response2 = await axios.get(url2, { headers });
      
      console.log(`Status HTTP: ${response2.status}`);
      console.log(`Resposta:`, JSON.stringify(response2.data, null, 2));
      
      // Verificar se temos um QR code na resposta
      if (response2.data && response2.data.qrcode) {
        console.log('\n✅ QR CODE OBTIDO COM SUCESSO!');
        console.log(`QR Code (primeiros 50 caracteres): ${response2.data.qrcode.substring(0, 50)}...`);
      } else if (response2.data && response2.data.error) {
        console.log(`\n❌ Erro retornado pela API: ${response2.data.error}`);
        if (response2.data.message) {
          console.log(`Mensagem de erro: ${response2.data.message}`);
        }
      } else {
        console.log('\n❓ Resposta sem QR code e sem mensagem de erro clara');
      }
    } catch (error) {
      console.log(`\n❌ Erro na solicitação: ${error.message}`);
      if (error.response) {
        console.log(`Status HTTP: ${error.response.status}`);
        console.log(`Resposta:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Tentar com o formato antigo também como último recurso
    const url3 = `https://api.z-api.io/instances/${instanceId}/qr-code`;
    
    console.log(`\n\n--- Tentativa formato antigo ---`);
    console.log(`Endpoint: ${url3}`);
    
    try {
      console.log('\nFazendo solicitação...');
      const response3 = await axios.get(url3, { headers });
      
      console.log(`Status HTTP: ${response3.status}`);
      console.log(`Resposta:`, JSON.stringify(response3.data, null, 2));
      
      // Verificar se temos um QR code na resposta
      if (response3.data && response3.data.qrcode) {
        console.log('\n✅ QR CODE OBTIDO COM SUCESSO!');
        console.log(`QR Code (primeiros 50 caracteres): ${response3.data.qrcode.substring(0, 50)}...`);
      } else if (response3.data && response3.data.error) {
        console.log(`\n❌ Erro retornado pela API: ${response3.data.error}`);
        if (response3.data.message) {
          console.log(`Mensagem de erro: ${response3.data.message}`);
        }
      } else {
        console.log('\n❓ Resposta sem QR code e sem mensagem de erro clara');
      }
    } catch (error) {
      console.log(`\n❌ Erro na solicitação: ${error.message}`);
      if (error.response) {
        console.log(`Status HTTP: ${error.response.status}`);
        console.log(`Resposta:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n=================================================');
    console.log('📋 CONCLUSÃO');
    console.log('=================================================');
    console.log('1. Se todos os testes falharam, é provável que:');
    console.log('   - As credenciais estejam inválidas ou expiradas');
    console.log('   - A instância não esteja conectada ou ativa');
    console.log('   - A API tenha mudado significativamente desde a documentação');
    console.log('\n2. Recomendações:');
    console.log('   - Verifique no painel da Z-API se a instância está ativa');
    console.log('   - Gere novas credenciais para garantir que são válidas');
    console.log('   - Entre em contato com o suporte da Z-API se o problema persistir');
  } catch (error) {
    console.error('Erro geral nos testes:', error);
  }
}

// Executar o teste
testQRCodeV2API();