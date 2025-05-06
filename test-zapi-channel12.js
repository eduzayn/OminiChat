// Script para testar as credenciais do canal 12
import axios from 'axios';

/**
 * Testa a conectividade com as credenciais do canal 12
 */
async function testChannel12Credentials() {
  try {
    console.log('🔍 Testando credenciais do Canal 12');
    
    // Credenciais específicas do canal 12
    const instanceId = '3E0C1D8649343073F64C266509411D32';
    const token = '8A823650D3962B7BA3574828';
    
    console.log(`\nCredenciais a testar:`);
    console.log(`- Instance ID: ${instanceId}`);
    console.log(`- Token: ${token}`);
    
    // Definir diferentes padrões de URL para teste
    console.log('\n--- Testando com token no path da URL ---');
    const baseUrl1 = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    console.log(`URL Base: ${baseUrl1}`);
    
    // Testar status
    console.log('\n1. Verificando status da conexão');
    try {
      const statusResponse = await axios.get(`${baseUrl1}/status`);
      console.log(`Resposta HTTP ${statusResponse.status}`);
      console.log('Dados:', JSON.stringify(statusResponse.data).substring(0, 200));
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('Detalhes:', JSON.stringify(error.response.data || {}).substring(0, 200));
      }
    }
    
    // Testar QR code
    console.log('\n2. Verificando QR code');
    try {
      const qrResponse = await axios.get(`${baseUrl1}/qr-code`);
      console.log(`Resposta HTTP ${qrResponse.status}`);
      console.log('Dados:', JSON.stringify(qrResponse.data).substring(0, 200));
      
      if (qrResponse.data && qrResponse.data.qrcode) {
        console.log('✅ QR code obtido!');
      }
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('Detalhes:', JSON.stringify(error.response.data || {}).substring(0, 200));
      }
    }
    
    // Agora testar com token no header
    console.log('\n\n--- Testando com token no cabeçalho ---');
    const baseUrl2 = `https://api.z-api.io/instances/${instanceId}`;
    console.log(`URL Base: ${baseUrl2}`);
    
    // Preparar cabeçalhos
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token
    };
    
    // Testar status
    console.log('\n1. Verificando status da conexão com token no cabeçalho');
    try {
      const statusResponse = await axios.get(`${baseUrl2}/status`, { headers });
      console.log(`Resposta HTTP ${statusResponse.status}`);
      console.log('Dados:', JSON.stringify(statusResponse.data).substring(0, 200));
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('Detalhes:', JSON.stringify(error.response.data || {}).substring(0, 200));
      }
    }
    
    // Testar QR code
    console.log('\n2. Verificando QR code com token no cabeçalho');
    try {
      const qrResponse = await axios.get(`${baseUrl2}/qr-code`, { headers });
      console.log(`Resposta HTTP ${qrResponse.status}`);
      console.log('Dados:', JSON.stringify(qrResponse.data).substring(0, 200));
      
      if (qrResponse.data && qrResponse.data.qrcode) {
        console.log('✅ QR code obtido!');
      }
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('Detalhes:', JSON.stringify(error.response.data || {}).substring(0, 200));
      }
    }
    
    // Agora testar com Authorization Bearer
    console.log('\n\n--- Testando com Authorization Bearer ---');
    const baseUrl3 = `https://api.z-api.io/instances/${instanceId}`;
    console.log(`URL Base: ${baseUrl3}`);
    
    // Preparar cabeçalhos
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Testar status
    console.log('\n1. Verificando status da conexão com Authorization Bearer');
    try {
      const statusResponse = await axios.get(`${baseUrl3}/status`, { headers: authHeaders });
      console.log(`Resposta HTTP ${statusResponse.status}`);
      console.log('Dados:', JSON.stringify(statusResponse.data).substring(0, 200));
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('Detalhes:', JSON.stringify(error.response.data || {}).substring(0, 200));
      }
    }
    
    console.log('\n=================================================');
    console.log('📊 CONCLUSÃO');
    console.log('=================================================');
    console.log('Os testes indicam possíveis problemas com as credenciais ou');
    console.log('com a estrutura da API. Recomendações:');
    console.log('1. Verificar se as credenciais estão atualizadas');
    console.log('2. Consultar a documentação atual da Z-API');
    console.log('3. Verificar se a instância está ativa no painel da Z-API');
  } catch (error) {
    console.error('Erro geral nos testes:', error);
  }
}

// Executar os testes
testChannel12Credentials();