// Script para testar a obtenção de QR code usando token no cabeçalho Authorization
import axios from 'axios';

async function testQRCodeWithAuthHeader() {
  try {
    // Usar as credenciais fornecidas
    const instanceId = '3DF871A7ADFB20FB49998E66062CE0C1';
    const token = 'A4E42029C24B872DA0842F47';
    
    // Lista de endpoint a testar
    const endpoints = [
      {
        name: "QR Code (Estilo API v1)",
        url: `https://api.z-api.io/instances/${instanceId}/qr-code`,
        authType: "header"
      },
      {
        name: "QR Code (Estilo API v1 - bearer)",
        url: `https://api.z-api.io/instances/${instanceId}/qr-code`,
        authType: "bearer" 
      },
      {
        name: "QR Code (versão simples)",
        url: `https://api.z-api.io/${instanceId}/qr-code`,
        authType: "header"
      },
      {
        name: "QR Code (com prefixo /api)",
        url: `https://api.z-api.io/api/instances/${instanceId}/qr-code`,
        authType: "header"
      }
    ];
    
    // Testar cada combinação
    for (const endpoint of endpoints) {
      console.log(`\n===== Testando: ${endpoint.name} =====`);
      console.log(`URL: ${endpoint.url}`);
      
      let headers = { 'Content-Type': 'application/json' };
      
      if (endpoint.authType === "header") {
        headers['Client-Token'] = token;
        console.log("Usando token no cabeçalho 'Client-Token'");
      } else if (endpoint.authType === "bearer") {
        headers['Authorization'] = `Bearer ${token}`;
        console.log("Usando token no cabeçalho 'Authorization' como Bearer token");
      }
      
      try {
        console.log("Fazendo requisição...");
        const response = await axios.get(endpoint.url, { headers });
        
        console.log(`Status da resposta: ${response.status}`);
        console.log("Resposta:", JSON.stringify(response.data, null, 2));
        
        if (response.data) {
          // Verificar se a resposta contém algum dado de QR code
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
        
        if (endpointError.response) {
          console.error(`Status HTTP: ${endpointError.response.status}`);
          console.error("Detalhes:", JSON.stringify(endpointError.response.data, null, 2));
        }
      }
    }
  } catch (error) {
    console.error("Erro geral no teste:", error.message);
  }
}

// Executar o teste
testQRCodeWithAuthHeader();