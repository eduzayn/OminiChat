// Script para extrair informações das variáveis ZAPI e testá-las
console.log('Analisando variáveis de ambiente Z-API');

// Obter credenciais
const instanceIdRaw = process.env.ZAPI_INSTANCE_ID;
const token = process.env.ZAPI_TOKEN;

console.log('ZAPI_INSTANCE_ID (bruto):', instanceIdRaw);
console.log('ZAPI_TOKEN:', token?.substring(0, 5) + '...' || 'não definido');

// Função para extrair o ID da instância de uma URL
function extractInstanceId(input) {
  if (!input) return null;
  
  // Verificar se é uma URL ou um caminho
  if (input.includes('http')) {
    console.log('Formato detectado: URL completa');
    
    // Tentar extrair da URL usando expressão regular
    // Procura por padrões como: 
    // - /instances/XXXXXXXXXXX/token/
    // - /XXXXXXXXXXX/token/
    const matches = input.match(/\/instances\/([^\/]+)\/token\/|\/([A-F0-9]{32})\/token\//i);
    
    if (matches && (matches[1] || matches[2])) {
      return matches[1] || matches[2];
    }
    
    // Tentar outro padrão: se é apenas o ID (letras/números com 32 caracteres)
    const idMatch = input.match(/([A-F0-9]{32})/i);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
    
    // Se chegou aqui, não conseguimos extrair o ID
    console.log('Não foi possível extrair o ID da instância da URL');
    return input;
  }
  
  // Se não é uma URL, assumimos que é diretamente o ID da instância
  return input;
}

const instanceId = extractInstanceId(instanceIdRaw);
console.log('ID da instância extraído:', instanceId);

// Analisar token
if (token) {
  if (token.length > 20) {
    console.log('O token parece estar em um formato válido');
  } else {
    console.log('O token parece muito curto. Formato esperado é uma string alfanumérica de pelo menos 20 caracteres');
  }
}

// Mostrar as URLs que seriam usadas para testes
console.log('\nURLs que serão usadas para testes:');
console.log('1. URL com token no path:');
console.log(`   https://api.z-api.io/instances/${instanceId}/token/${token}`);

console.log('\n2. URL com token no cabeçalho:');
console.log(`   https://api.z-api.io/instances/${instanceId}`);
console.log(`   Header: Client-Token: ${token}`);

console.log('\nFormato recomendado pela Z-API (2023):');
console.log(`   https://api.z-api.io/instances/${instanceId}`);
console.log(`   Header: Client-Token: ${token}`);