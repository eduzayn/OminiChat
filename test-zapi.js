import axios from 'axios';

// Função para testar a obtenção do QR code
async function testQRCodeEndpoint(instanceId, token) {
  try {
    console.log(`Testando endpoint de QR code para instância ${instanceId}`);
    
    // Teste usando o endpoint corrigido /qr-code
    const qrCodeUrl = `https://api.z-api.io/instances/${instanceId}/qr-code`;
    console.log(`Fazendo requisição GET para: ${qrCodeUrl}`);
    
    const response = await axios.get(qrCodeUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': token
      }
    });
    
    console.log('Resposta do endpoint de QR code:');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Estrutura da resposta:', Object.keys(response.data));
    
    // Verificar se a resposta contém um QR code
    if (response.data.qrcode) {
      console.log('QR code encontrado na resposta!');
      
      // Mostrar apenas os primeiros 50 caracteres do QR code para não sobrecarregar o console
      const qrCodePreview = response.data.qrcode.substring(0, 50) + '...';
      console.log('QR code (preview):', qrCodePreview);
    } else {
      console.log('Resposta não contém QR code. Detalhes da resposta:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    return response.data;
  } catch (error) {
    console.error('Erro ao testar endpoint de QR code:');
    
    if (error.response) {
      // A requisição foi feita e o servidor respondeu com um status de erro
      console.error('Resposta de erro do servidor:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Nenhuma resposta recebida:', error.request);
    } else {
      // Ocorreu um erro durante a configuração da requisição
      console.error('Erro na configuração da requisição:', error.message);
    }
    
    return null;
  }
}

// Função principal para executar os testes
async function runTests() {
  // Este é apenas um exemplo, você precisará fornecer credenciais válidas
  // Estes valores serão obtidos do canal configurado
  const instanceId = process.env.ZAPI_INSTANCE_ID || 'SEU_INSTANCE_ID';
  const token = process.env.ZAPI_TOKEN || 'SEU_TOKEN';
  
  console.log('Iniciando testes da API Z-API...');
  
  // Teste 1: Obter QR code
  const qrCodeResult = await testQRCodeEndpoint(instanceId, token);
  
  console.log('\nTestes concluídos.');
}

// Executar os testes
runTests().catch(console.error);