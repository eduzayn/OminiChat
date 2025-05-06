// Script específico para testar o QR code usando diferentes cabeçalhos de autenticação
import axios from 'axios';

async function testQRCodeWithAuthHeader() {
  try {
    // Credenciais extraídas do painel Z-API
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C248B72DA0842F47';
    
    console.log('🔍 Testando QR Code com vários formatos de header de autenticação');
    
    // URL base no formato recomendado pela documentação atual
    const baseUrl = `https://api.z-api.io/instances/${instanceId}`;
    
    // Primeiro teste - Client-Token header
    console.log('\n--- Teste 1: Client-Token header ---');
    try {
      const response1 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': token
        }
      });
      
      console.log(`Status HTTP: ${response1.status}`);
      console.log(`Resposta:`, JSON.stringify(response1.data, null, 2));
      
      if (response1.data && response1.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response1.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com Client-Token header:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Segundo teste - Authorization Bearer
    console.log('\n--- Teste 2: Authorization Bearer ---');
    try {
      const response2 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Status HTTP: ${response2.status}`);
      console.log(`Resposta:`, JSON.stringify(response2.data, null, 2));
      
      if (response2.data && response2.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response2.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com Authorization Bearer:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Terceiro teste - x-api-key
    console.log('\n--- Teste 3: x-api-key ---');
    try {
      const response3 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token
        }
      });
      
      console.log(`Status HTTP: ${response3.status}`);
      console.log(`Resposta:`, JSON.stringify(response3.data, null, 2));
      
      if (response3.data && response3.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response3.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com x-api-key:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Quarto teste - apiToken
    console.log('\n--- Teste 4: apiToken ---');
    try {
      const response4 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'apiToken': token
        }
      });
      
      console.log(`Status HTTP: ${response4.status}`);
      console.log(`Resposta:`, JSON.stringify(response4.data, null, 2));
      
      if (response4.data && response4.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response4.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com apiToken:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Quinto teste - token como parâmetro
    console.log('\n--- Teste 5: token como parâmetro de query ---');
    try {
      const response5 = await axios.get(`${baseUrl}/qr-code?token=${token}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Status HTTP: ${response5.status}`);
      console.log(`Resposta:`, JSON.stringify(response5.data, null, 2));
      
      if (response5.data && response5.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response5.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com token como parâmetro:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Sexto teste - X-API-TOKEN
    console.log('\n--- Teste 6: X-API-TOKEN ---');
    try {
      const response6 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-TOKEN': token
        }
      });
      
      console.log(`Status HTTP: ${response6.status}`);
      console.log(`Resposta:`, JSON.stringify(response6.data, null, 2));
      
      if (response6.data && response6.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response6.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com X-API-TOKEN:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Sétimo teste - Client-ID e Client-Token
    console.log('\n--- Teste 7: Client-ID e Client-Token separados ---');
    try {
      const response7 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'Client-ID': instanceId,
          'Client-Token': token
        }
      });
      
      console.log(`Status HTTP: ${response7.status}`);
      console.log(`Resposta:`, JSON.stringify(response7.data, null, 2));
      
      if (response7.data && response7.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response7.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com Client-ID e Client-Token:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Oitavo teste - API-KEY
    console.log('\n--- Teste 8: API-KEY ---');
    try {
      const response8 = await axios.get(`${baseUrl}/qr-code`, {
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': token
        }
      });
      
      console.log(`Status HTTP: ${response8.status}`);
      console.log(`Resposta:`, JSON.stringify(response8.data, null, 2));
      
      if (response8.data && response8.data.qrcode) {
        console.log('✅ QR code obtido com sucesso!');
        console.log(`Código (primeiros 50 caracteres): ${response8.data.qrcode.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log('❌ Erro com API-KEY:', error.message);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Dados:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n=================================================');
    console.log('📊 RESUMO DOS TESTES DE AUTENTICAÇÃO');
    console.log('=================================================');
    console.log('Testamos diferentes formas de autenticação para o endpoint de QR code:');
    console.log('1. Client-Token header');
    console.log('2. Authorization Bearer');
    console.log('3. x-api-key');
    console.log('4. apiToken');
    console.log('5. Token como parâmetro de query');
    console.log('6. X-API-TOKEN');
    console.log('7. Client-ID e Client-Token');
    console.log('8. API-KEY');
  } catch (error) {
    console.error('Erro geral nos testes:', error);
  }
}

// Executar o teste
testQRCodeWithAuthHeader();