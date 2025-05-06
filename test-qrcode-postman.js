// Script para testar a obtenção de QR code usando os endpoints documentados no Postman da Z-API
import axios from 'axios';

async function testQRCodeEndpoints() {
  try {
    // Usar as credenciais fornecidas
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C24B872DA0842F47';
    
    // Lista de endpoints do Postman
    const endpoints = [
      {
        name: "QR Code (Imagem)",
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code`,
        description: "Retorna o QR code como imagem"
      },
      {
        name: "QR Code (Bytes)",
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code-bytes`,
        description: "Retorna o QR code em bytes"
      },
      {
        name: "QR Code (Telefone)",
        url: `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code-phone`,
        description: "Retorna o QR code para o telefone"
      }
    ];
    
    // Testar cada endpoint
    for (const endpoint of endpoints) {
      console.log(`\n===== Testando: ${endpoint.name} =====`);
      console.log(`URL: ${endpoint.url}`);
      console.log(`Descrição: ${endpoint.description}`);
      
      try {
        console.log("Fazendo requisição...");
        const response = await axios.get(endpoint.url);
        
        console.log(`Status da resposta: ${response.status}`);
        console.log("Resposta completa:", response.data);
        
        // Verificar se a resposta contém algum dado de QR code
        if (response.data) {
          const possibleQRFields = ['qrcode', 'image', 'base64', 'code', 'value', 'qr'];
          
          const foundField = possibleQRFields.find(field => response.data[field]);
          
          if (foundField) {
            console.log(`QR code encontrado no campo '${foundField}'`);
            console.log(`QR code (primeiros 50 caracteres): ${response.data[foundField].substring(0, 50)}...`);
            console.log("\n✅ SUCESSO: QR code encontrado!");
          } else if (response.data.connected === true) {
            console.log("O dispositivo já está conectado, não é necessário QR code.");
          } else {
            console.log("Resposta não contém um QR code identificável.");
          }
        }
      } catch (endpointError) {
        console.error(`Erro ao acessar ${endpoint.name}:`, endpointError.message);
        
        // Mostrar detalhes do erro
        if (endpointError.response) {
          console.error(`Status HTTP: ${endpointError.response.status}`);
          console.error("Detalhes:", endpointError.response.data);
        }
      }
      
      console.log("\n");
    }
    
  } catch (error) {
    console.error("Erro geral no teste:", error.message);
  }
}

testQRCodeEndpoints();