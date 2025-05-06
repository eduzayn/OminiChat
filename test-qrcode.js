// Script para testar diretamente a obtenção de QR code da Z-API
import axios from 'axios';

async function testQRCode() {
  try {
    // Usar as credenciais fornecidas
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C24B872DA0842F47';
    
    // Lista de todos os endpoints a serem testados
    const endpointsToTry = [
      { path: '/qrcode', description: 'traditional qrcode endpoint' },
      { path: '/qr-code', description: 'hyphenated qr-code endpoint' },
      { path: '/qrcode-image', description: 'qrcode-image endpoint' },
      { path: '/code', description: 'simple code endpoint' },
      { path: '/session/qrcode', description: 'session qrcode endpoint' },
      { path: '/connect', description: 'connect endpoint' },
      { path: '/connection', description: 'connection status endpoint' },
      { path: '/status', description: 'status endpoint' },
      { path: '/phone', description: 'phone info endpoint' }
    ];
    
    for (const endpoint of endpointsToTry) {
      try {
        // Construir URL para este endpoint
        const url = `https://api.z-api.io/instances/${instanceId}/token/${token}${endpoint.path}`;
        
        console.log(`\n=== Testando ${endpoint.description} ===`);
        console.log(`Fazendo requisição GET para: ${url}`);
        
        const response = await axios.get(url);
        
        console.log('Status da resposta:', response.status);
        
        // Verificar os diferentes formatos possíveis do QR code
        if (response.data) {
          const qrCodeValue = response.data.qrcode || 
                            response.data.base64 || 
                            response.data.image || 
                            response.data.qrCode || 
                            response.data.value;
          
          if (qrCodeValue) {
            console.log('QR code obtido com sucesso!');
            console.log(`QR code (primeiros 50 caracteres): ${qrCodeValue.substring(0, 50)}...`);
            
            // Se encontramos um QR code, podemos parar
            console.log('=== SUCESSO: QR code encontrado no endpoint ' + endpoint.path + ' ===');
            return;
          } else if (response.data.connected === true) {
            console.log('Dispositivo já está conectado, não precisa de QR code.');
          } else {
            console.log('Resposta sem QR code:', JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        console.error(`Erro ao acessar ${endpoint.path}:`, error.message);
        
        // Mostrar detalhes do erro da API se disponível
        if (error.response && error.response.data) {
          console.error('Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    console.log('\n=== RESULTADO ===');
    console.log('Nenhum endpoint retornou um QR code válido.');
    console.log('Possíveis problemas:');
    console.log('1. O dispositivo já está conectado (verificar endpoint /connection ou /status)');
    console.log('2. As credenciais são inválidas');
    console.log('3. A documentação da API mudou - verificar documentação mais recente');
  } catch (error) {
    console.error('Erro geral no teste:', error.message);
  }
}

// Executar o teste
testQRCode();