// Script para testar as novas credenciais Z-API fornecidas
import axios from 'axios';

async function testNewZAPICredentials() {
  try {
    // Obter credenciais das variáveis de ambiente
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token = process.env.ZAPI_TOKEN;
    
    if (!instanceId || !token) {
      console.error('❌ Credenciais não encontradas nas variáveis de ambiente');
      console.log('Certifique-se de que ZAPI_INSTANCE_ID e ZAPI_TOKEN estão configurados.');
      return;
    }
    
    console.log('🔍 Testando novas credenciais Z-API');
    console.log(`Instance ID: ${instanceId.substring(0, 5)}...`);
    console.log(`Token: ${token.substring(0, 5)}...`);
    
    // Abordagem 1: Token no path da URL
    console.log('\n--- Testando com token no path ---');
    const baseUrl1 = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    
    try {
      console.log(`Verificando status via: ${baseUrl1}/status`);
      const response = await axios.get(`${baseUrl1}/status`);
      console.log(`✅ Resposta HTTP ${response.status}`);
      console.log('Dados:', JSON.stringify(response.data, null, 2));
      
      if (!response.data.error) {
        console.log('✅ Chamada bem-sucedida!');
        
        if (response.data.connected) {
          console.log('✅ Dispositivo já está conectado!');
        } else {
          console.log('ℹ️ Dispositivo não está conectado, tentando obter QR code...');
          
          // Tentar obter QR code
          try {
            const qrResponse = await axios.get(`${baseUrl1}/qr-code`);
            console.log(`✅ Resposta QR code: HTTP ${qrResponse.status}`);
            
            if (qrResponse.data && qrResponse.data.qrcode) {
              console.log('✅ QR code obtido! Primeiros 100 caracteres:');
              console.log(qrResponse.data.qrcode.substring(0, 100) + '...');
            } else {
              console.log('❌ QR code não encontrado na resposta');
              console.log('Resposta:', JSON.stringify(qrResponse.data, null, 2));
            }
          } catch (qrError) {
            console.log('❌ Erro ao obter QR code:', qrError.message);
            if (qrError.response) {
              console.log('Dados do erro:', JSON.stringify(qrError.response.data, null, 2));
            }
          }
        }
      } else {
        console.log('❌ Erro na resposta:', response.data.error);
      }
    } catch (error) {
      console.log('❌ Erro ao acessar com token no path:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Abordagem 2: Token no header
    console.log('\n--- Testando com token no cabeçalho ---');
    const baseUrl2 = `https://api.z-api.io/instances/${instanceId}`;
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': token
    };
    
    try {
      console.log(`Verificando status via: ${baseUrl2}/status`);
      const response = await axios.get(`${baseUrl2}/status`, { headers });
      console.log(`✅ Resposta HTTP ${response.status}`);
      console.log('Dados:', JSON.stringify(response.data, null, 2));
      
      if (!response.data.error) {
        console.log('✅ Chamada bem-sucedida!');
        
        if (response.data.connected) {
          console.log('✅ Dispositivo já está conectado!');
        } else {
          console.log('ℹ️ Dispositivo não está conectado, tentando obter QR code...');
          
          // Tentar obter QR code
          try {
            const qrResponse = await axios.get(`${baseUrl2}/qr-code`, { headers });
            console.log(`✅ Resposta QR code: HTTP ${qrResponse.status}`);
            
            if (qrResponse.data && qrResponse.data.qrcode) {
              console.log('✅ QR code obtido! Primeiros 100 caracteres:');
              console.log(qrResponse.data.qrcode.substring(0, 100) + '...');
            } else {
              console.log('❌ QR code não encontrado na resposta');
              console.log('Resposta:', JSON.stringify(qrResponse.data, null, 2));
            }
          } catch (qrError) {
            console.log('❌ Erro ao obter QR code:', qrError.message);
            if (qrError.response) {
              console.log('Dados do erro:', JSON.stringify(qrError.response.data, null, 2));
            }
          }
        }
      } else {
        console.log('❌ Erro na resposta:', response.data.error);
      }
    } catch (error) {
      console.log('❌ Erro ao acessar com token no cabeçalho:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Abordagem 3: Token no Authorization Bearer
    console.log('\n--- Testando com token no Authorization Bearer ---');
    const baseUrl3 = `https://api.z-api.io/instances/${instanceId}`;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    try {
      console.log(`Verificando status via: ${baseUrl3}/status`);
      const response = await axios.get(`${baseUrl3}/status`, { headers: authHeaders });
      console.log(`✅ Resposta HTTP ${response.status}`);
      console.log('Dados:', JSON.stringify(response.data, null, 2));
      
      if (!response.data.error) {
        console.log('✅ Chamada bem-sucedida!');
        
        if (response.data.connected) {
          console.log('✅ Dispositivo já está conectado!');
        } else {
          console.log('ℹ️ Dispositivo não está conectado, tentando obter QR code...');
          
          // Tentar obter QR code
          try {
            const qrResponse = await axios.get(`${baseUrl3}/qr-code`, { headers: authHeaders });
            console.log(`✅ Resposta QR code: HTTP ${qrResponse.status}`);
            
            if (qrResponse.data && qrResponse.data.qrcode) {
              console.log('✅ QR code obtido! Primeiros 100 caracteres:');
              console.log(qrResponse.data.qrcode.substring(0, 100) + '...');
            } else {
              console.log('❌ QR code não encontrado na resposta');
              console.log('Resposta:', JSON.stringify(qrResponse.data, null, 2));
            }
          } catch (qrError) {
            console.log('❌ Erro ao obter QR code:', qrError.message);
            if (qrError.response) {
              console.log('Dados do erro:', JSON.stringify(qrError.response.data, null, 2));
            }
          }
        }
      } else {
        console.log('❌ Erro na resposta:', response.data.error);
      }
    } catch (error) {
      console.log('❌ Erro ao acessar com Authorization Bearer:', error.message);
      if (error.response) {
        console.log('Dados do erro:', JSON.stringify(error.response.data, null, 2));
      }
    }
  } catch (error) {
    console.error('Erro geral no teste:', error);
  }
}

// Executar o teste
testNewZAPICredentials();