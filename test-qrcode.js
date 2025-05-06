// Script para testar a obtenção do QR Code com as credenciais corretas
import axios from 'axios';

async function testQRCode() {
  try {
    // Usar exatamente os IDs mostrados na imagem do painel Z-API
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C248B72DA0842F47';
    
    console.log('🔍 Testando QR Code com credenciais exatas da imagem');
    console.log(`Instance ID: ${instanceId}`);
    console.log(`Token: ${token.substring(0, 5)}...`);
    
    // Testar o formato exato da URL mostrada na imagem
    console.log('\n--- Testando com a URL exata da imagem ---');
    const exactUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    console.log(`URL: ${exactUrl}`);
    
    try {
      console.log('\n1. Verificando status');
      const statusResponse = await axios.get(`${exactUrl}/status`);
      console.log(`Resposta HTTP ${statusResponse.status}`);
      console.log('Dados:', JSON.stringify(statusResponse.data, null, 2));
      
      if (statusResponse.data.error) {
        console.log(`❌ Erro na resposta: ${statusResponse.data.error}`);
      } else {
        console.log('✅ Status obtido com sucesso!');
        
        if (statusResponse.data.connected) {
          console.log('✅ Dispositivo já está conectado!');
        } else {
          console.log('ℹ️ Dispositivo não está conectado, tentando obter QR code...');
        }
      }
    } catch (error) {
      console.log('❌ Erro ao verificar status:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    try {
      console.log('\n2. Tentando obter QR code');
      const qrResponse = await axios.get(`${exactUrl}/qr-code`);
      console.log(`Resposta HTTP ${qrResponse.status}`);
      
      if (qrResponse.data.error) {
        console.log(`❌ Erro na resposta: ${qrResponse.data.error}`);
      } else {
        console.log('✅ Resposta recebida sem erros');
        
        if (qrResponse.data.qrcode) {
          console.log('✅ QR code obtido! Primeiros 100 caracteres:');
          console.log(qrResponse.data.qrcode.substring(0, 100) + '...');
        } else {
          console.log('❌ QR code não encontrado na resposta');
          console.log('Resposta:', JSON.stringify(qrResponse.data, null, 2));
        }
      }
    } catch (error) {
      console.log('❌ Erro ao obter QR code:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Teste com Client-Token no cabeçalho
    console.log('\n--- Testando com token no cabeçalho Client-Token ---');
    const baseUrl = `https://api.z-api.io/instances/${instanceId}`;
    console.log(`URL Base: ${baseUrl}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token
    };
    
    try {
      console.log('\n1. Verificando status com token no cabeçalho');
      const statusResponse = await axios.get(`${baseUrl}/status`, { headers });
      console.log(`Resposta HTTP ${statusResponse.status}`);
      console.log('Dados:', JSON.stringify(statusResponse.data, null, 2));
      
      if (statusResponse.data.error) {
        console.log(`❌ Erro na resposta: ${statusResponse.data.error}`);
      } else {
        console.log('✅ Status obtido com sucesso!');
        
        if (statusResponse.data.connected) {
          console.log('✅ Dispositivo já está conectado!');
        } else {
          console.log('ℹ️ Dispositivo não está conectado, tentando obter QR code...');
        }
      }
    } catch (error) {
      console.log('❌ Erro ao verificar status com token no cabeçalho:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    try {
      console.log('\n2. Tentando obter QR code com token no cabeçalho');
      const qrResponse = await axios.get(`${baseUrl}/qr-code`, { headers });
      console.log(`Resposta HTTP ${qrResponse.status}`);
      
      if (qrResponse.data.error) {
        console.log(`❌ Erro na resposta: ${qrResponse.data.error}`);
      } else {
        console.log('✅ Resposta recebida sem erros');
        
        if (qrResponse.data.qrcode) {
          console.log('✅ QR code obtido! Primeiros 100 caracteres:');
          console.log(qrResponse.data.qrcode.substring(0, 100) + '...');
        } else {
          console.log('❌ QR code não encontrado na resposta');
          console.log('Resposta:', JSON.stringify(qrResponse.data, null, 2));
        }
      }
    } catch (error) {
      console.log('❌ Erro ao obter QR code com token no cabeçalho:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Importante: tentar com o endpoint exato /send-text para verificar
    console.log('\n--- Testando com endpoint send-text (como na URL da imagem) ---');
    try {
      console.log('\nVerificando URL exata da imagem com /send-text');
      const sendTextUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
      console.log(`URL: ${sendTextUrl}`);
      
      // Fazendo uma requisição POST para testar envio (sem enviar mensagem real)
      const checkResponse = await axios.get(sendTextUrl);
      console.log(`Resposta HTTP ${checkResponse.status}`);
      console.log('Dados:', JSON.stringify(checkResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao verificar URL com send-text:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n--- Testando em v2 ou outras versões ---');
    try {
      console.log('\nVerificando URL com prefixo v2');
      const v2Url = `https://api.z-api.io/v2/instances/${instanceId}`;
      console.log(`URL: ${v2Url}/status`);
      
      const v2Response = await axios.get(`${v2Url}/status`, { headers });
      console.log(`Resposta HTTP ${v2Response.status}`);
      console.log('Dados:', JSON.stringify(v2Response.data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao verificar URL com prefixo v2:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    try {
      console.log('\nVerificando URL com prefixo api');
      const apiUrl = `https://api.z-api.io/api/instances/${instanceId}`;
      console.log(`URL: ${apiUrl}/status`);
      
      const apiResponse = await axios.get(`${apiUrl}/status`, { headers });
      console.log(`Resposta HTTP ${apiResponse.status}`);
      console.log('Dados:', JSON.stringify(apiResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao verificar URL com prefixo api:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n=================================================');
    console.log('📊 CONCLUSÃO');
    console.log('=================================================');
    console.log('Recomendações baseadas nos resultados dos testes:');
    console.log('1. Verificar se a instância está ativa no painel da Z-API');
    console.log('2. Confirmar se está usando a última versão da API');
    console.log('3. Verificar se há documentação atualizada sobre os endpoints');
  } catch (error) {
    console.error('Erro geral no teste:', error);
  }
}

// Executar o teste
testQRCode();