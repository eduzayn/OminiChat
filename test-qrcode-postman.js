// Script para testar os endpoints do Z-API usando a abordagem correta para cada um
import axios from 'axios';

async function testQRCodeEndpoints() {
  try {
    // Credenciais exatas da imagem
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C248B72DA0842F47';
    
    console.log('🔍 Testando endpoints Z-API com métodos HTTP corretos');
    
    // Testando send-text com método POST
    console.log('\n--- Testando endpoint /send-text com método POST ---');
    const sendTextUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
    console.log(`URL: ${sendTextUrl}`);
    
    // Dados mínimos para um teste de mensagem
    const testMessageData = {
      phone: "5511999999999", // Número de teste
      message: "Teste API"
    };
    
    try {
      const sendResponse = await axios.post(sendTextUrl, testMessageData);
      console.log(`Resposta HTTP ${sendResponse.status}`);
      console.log('Dados:', JSON.stringify(sendResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao enviar mensagem com token no path:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Agora testando com token no cabeçalho
    console.log('\n--- Testando endpoint /send-text com token no cabeçalho ---');
    const baseUrl = `https://api.z-api.io/instances/${instanceId}/send-text`;
    console.log(`URL: ${baseUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token
    };
    
    try {
      const sendResponse = await axios.post(baseUrl, testMessageData, { headers });
      console.log(`Resposta HTTP ${sendResponse.status}`);
      console.log('Dados:', JSON.stringify(sendResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao enviar mensagem com token no cabeçalho:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Testando padrão mais recente da API
    console.log('\n--- Testando com o padrão mais recente da Z-API (v2) ---');
    const v2Url = `https://api.z-api.io/v2/instances/${instanceId}/`;
    
    // Testando status no padrão v2
    console.log('\nVerificando status no padrão v2');
    try {
      const statusV2Response = await axios.get(`${v2Url}status`, { headers });
      console.log(`Resposta HTTP ${statusV2Response.status}`);
      console.log('Dados:', JSON.stringify(statusV2Response.data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao verificar status no v2:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Testando qrcode no padrão v2
    console.log('\nVerificando qr-code no padrão v2');
    try {
      const qrV2Response = await axios.get(`${v2Url}qr-code`, { headers });
      console.log(`Resposta HTTP ${qrV2Response.status}`);
      console.log('Dados:', JSON.stringify(qrV2Response.data, null, 2));
      
      if (qrV2Response.data && qrV2Response.data.qrcode) {
        console.log('✅ QR Code obtido no padrão v2!');
        console.log('Primeiros 100 caracteres:', qrV2Response.data.qrcode.substring(0, 100) + '...');
      }
    } catch (error) {
      console.log('❌ Erro ao obter QR code no v2:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Teste final com o formato mais recente e corrigido
    console.log('\n--- Testando com separação total de instância e token ---');
    const standardUrl = `https://api.z-api.io/instances/${instanceId}`;
    
    // Testando diretamente o endpoint de QR Code
    console.log('\nVerificando QR code diretamente');
    try {
      const qrDirectResponse = await axios.get(`${standardUrl}/qr-code`, { 
        headers: {
          'Client-Token': token 
        }
      });
      console.log(`Resposta HTTP ${qrDirectResponse.status}`);
      if (qrDirectResponse.data && qrDirectResponse.data.qrcode) {
        console.log('✅ QR Code obtido!');
        console.log('Primeiros 100 caracteres:', qrDirectResponse.data.qrcode.substring(0, 100) + '...');
      } else {
        console.log('Dados:', JSON.stringify(qrDirectResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Erro ao obter QR code diretamente:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Testando também o header Authorization como fallback
    console.log('\nVerificando QR code com Authorization header');
    try {
      const authHeaderResponse = await axios.get(`${standardUrl}/qr-code`, { 
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Resposta HTTP ${authHeaderResponse.status}`);
      if (authHeaderResponse.data && authHeaderResponse.data.qrcode) {
        console.log('✅ QR Code obtido com Authorization header!');
        console.log('Primeiros 100 caracteres:', authHeaderResponse.data.qrcode.substring(0, 100) + '...');
      } else {
        console.log('Dados:', JSON.stringify(authHeaderResponse.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Erro ao obter QR code com Authorization header:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n=================================================');
    console.log('📊 RESULTADOS E PRÓXIMOS PASSOS');
    console.log('=================================================');
    console.log('Baseado em todos os testes, as seguintes conclusões podem ser tiradas:');
    console.log('- A API parece exigir o token no cabeçalho Client-Token');
    console.log('- O formato adequado da URL é https://api.z-api.io/instances/{ID_INSTANCIA}');
    console.log('- Os endpoints send-text exigem o método POST');
    console.log('- Para endpoints GET (status, qr-code), não inclua o token na URL');
  } catch (error) {
    console.error('Erro geral nos testes:', error);
  }
}

// Executar os testes
testQRCodeEndpoints();