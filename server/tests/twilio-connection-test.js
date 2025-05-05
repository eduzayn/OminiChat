/**
 * Teste de conexão com a API do Twilio
 * Baseado na documentação oficial: https://www.twilio.com/docs/conversations/api/conversation-resource
 */

import axios from 'axios';

// Obter as variáveis de ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Iniciando teste de conexão com a API do Twilio');
console.log('-----------------------------------------');
console.log(`TWILIO_ACCOUNT_SID está definido: ${Boolean(accountSid)}`);
console.log(`TWILIO_AUTH_TOKEN está definido: ${Boolean(authToken)}`);
console.log(`TWILIO_API_KEY está definido: ${Boolean(apiKey)}`);
console.log(`TWILIO_PHONE_NUMBER está definido: ${Boolean(phoneNumber)}`);
console.log('-----------------------------------------');

// Função para testar a autenticação básica com Account SID e Auth Token
async function testBasicAuth() {
  console.log('Testando autenticação com Account SID e Auth Token');
  
  if (!accountSid || !authToken) {
    console.error('ERRO: Account SID ou Auth Token não estão definidos');
    return false;
  }
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        auth: {
          username: accountSid,
          password: authToken
        }
      }
    );
    
    console.log('✅ Autenticação básica com Account SID e Auth Token: SUCESSO');
    console.log(`Detalhes da conta: ${response.data.friendly_name}`);
    console.log(`Status da conta: ${response.data.status}`);
    return true;
  } catch (error) {
    console.error('❌ Falha na autenticação básica:');
    console.error(`Código de status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem de erro: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Função para testar a autenticação com API Key
async function testApiKeyAuth() {
  console.log('Testando autenticação com API Key e Secret');
  
  if (!apiKey || !apiSecret || !accountSid) {
    console.error('ERRO: API Key, API Secret ou Account SID não estão definidos');
    return false;
  }
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        auth: {
          username: apiKey,
          password: apiSecret
        }
      }
    );
    
    console.log('✅ Autenticação com API Key e Secret: SUCESSO');
    console.log(`Detalhes da conta: ${response.data.friendly_name}`);
    return true;
  } catch (error) {
    console.error('❌ Falha na autenticação com API Key:');
    console.error(`Código de status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem de erro: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Testar acesso à API de Conversas (Conversations API)
async function testConversationsApi() {
  console.log('Testando acesso à API de Conversas (Conversations API)');
  
  if (!accountSid || (!authToken && !apiKey)) {
    console.error('ERRO: Credenciais de autenticação incompletas');
    return false;
  }
  
  // Configurar autenticação
  const auth = apiKey ? 
    { username: apiKey, password: apiSecret } : 
    { username: accountSid, password: authToken };
  
  try {
    // De acordo com a documentação: https://www.twilio.com/docs/conversations/api/conversation-resource
    const response = await axios.get(
      `https://conversations.twilio.com/v1/Conversations`,
      { auth }
    );
    
    console.log('✅ Acesso à API de Conversas: SUCESSO');
    console.log(`Número de conversas disponíveis: ${response.data.conversations.length}`);
    return true;
  } catch (error) {
    console.error('❌ Falha no acesso à API de Conversas:');
    console.error(`Código de status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem de erro: ${error.response?.data?.message || error.message}`);
    
    // Verificar se o erro é relacionado à não ativação do serviço Conversations
    if (error.response?.data?.code === 20404) {
      console.warn('⚠️ O serviço Twilio Conversations pode não estar ativado para esta conta.');
      console.warn('Verifique se o serviço está ativado no console do Twilio.');
    }
    
    return false;
  }
}

// Testar acesso à API de Messaging Services
async function testMessagingServices() {
  console.log('Testando acesso à API de Messaging Services');
  
  if (!accountSid || (!authToken && !apiKey)) {
    console.error('ERRO: Credenciais de autenticação incompletas');
    return false;
  }
  
  // Configurar autenticação
  const auth = apiKey ? 
    { username: apiKey, password: apiSecret } : 
    { username: accountSid, password: authToken };
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messaging/Services.json`,
      { auth }
    );
    
    console.log('✅ Acesso à API de Messaging Services: SUCESSO');
    console.log(`Serviços de mensagens disponíveis: ${response.data.services.length}`);
    
    if (response.data.services.length > 0) {
      console.log('Detalhes do primeiro serviço:');
      console.log(`- ID: ${response.data.services[0].sid}`);
      console.log(`- Nome: ${response.data.services[0].friendly_name}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Falha no acesso à API de Messaging Services:');
    console.error(`Código de status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem de erro: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Testar informações do número de telefone do WhatsApp
async function testWhatsAppPhoneNumber() {
  console.log('Testando informações do número de telefone do WhatsApp');
  
  if (!accountSid || (!authToken && !apiKey) || !phoneNumber) {
    console.error('ERRO: Credenciais de autenticação ou número de telefone incompletos');
    return false;
  }
  
  // Remover o prefixo "whatsapp:" se existir
  const formattedNumber = phoneNumber.replace('whatsapp:', '').replace(/^\+/, '');
  
  // Configurar autenticação
  const auth = apiKey ? 
    { username: apiKey, password: apiSecret } : 
    { username: accountSid, password: authToken };
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      { auth }
    );
    
    console.log('✅ Acesso à API de Números de Telefone: SUCESSO');
    console.log(`Números de telefone disponíveis: ${response.data.incoming_phone_numbers.length}`);
    
    // Verificar se o número do WhatsApp está nos números disponíveis
    const phoneFound = response.data.incoming_phone_numbers.some(
      phone => phone.phone_number.includes(formattedNumber)
    );
    
    if (phoneFound) {
      console.log(`✅ O número ${formattedNumber} foi encontrado na sua conta Twilio.`);
    } else {
      console.warn(`⚠️ O número ${formattedNumber} não foi encontrado na sua conta Twilio.`);
      console.warn('Verifique se o número está configurado corretamente no console do Twilio.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Falha ao verificar números de telefone:');
    console.error(`Código de status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem de erro: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Executar os testes
async function runTests() {
  try {
    console.log('=== Iniciando bateria de testes de conexão Twilio ===');
    
    // Teste 1: Autenticação básica
    const basicAuthSuccess = await testBasicAuth();
    console.log('-----------------------------------------');
    
    // Teste 2: Autenticação com API Key (se disponível)
    let apiKeySuccess = false;
    if (apiKey) {
      apiKeySuccess = await testApiKeyAuth();
      console.log('-----------------------------------------');
    } else {
      console.log('Pulando teste de API Key (não configurada)');
      console.log('-----------------------------------------');
    }
    
    // Teste 3: API de Conversas
    const conversationsApiSuccess = await testConversationsApi();
    console.log('-----------------------------------------');
    
    // Teste 4: Messaging Services
    const messagingServicesSuccess = await testMessagingServices();
    console.log('-----------------------------------------');
    
    // Teste 5: Verificação do número de telefone WhatsApp
    if (phoneNumber) {
      const phoneNumberSuccess = await testWhatsAppPhoneNumber();
      console.log('-----------------------------------------');
    } else {
      console.log('Pulando teste de número de telefone (não configurado)');
      console.log('-----------------------------------------');
    }
    
    // Resumo dos resultados
    console.log('=== Resumo dos testes de conexão Twilio ===');
    console.log(`Autenticação básica: ${basicAuthSuccess ? '✅ SUCESSO' : '❌ FALHA'}`);
    if (apiKey) {
      console.log(`Autenticação com API Key: ${apiKeySuccess ? '✅ SUCESSO' : '❌ FALHA'}`);
    }
    console.log(`API de Conversas: ${conversationsApiSuccess ? '✅ SUCESSO' : '❌ FALHA'}`);
    console.log(`API de Messaging Services: ${messagingServicesSuccess ? '✅ SUCESSO' : '❌ FALHA'}`);
    
    // Recomendações
    console.log('-----------------------------------------');
    console.log('Recomendações:');
    
    if (!basicAuthSuccess && !apiKeySuccess) {
      console.log('❌ Verifique suas credenciais Twilio (Account SID e Auth Token ou API Key).');
      console.log('❌ Confirme se as variáveis de ambiente estão configuradas corretamente.');
    } else if (!conversationsApiSuccess) {
      console.log('⚠️ O serviço Twilio Conversations pode não estar ativado para esta conta.');
      console.log('⚠️ Ative o serviço Conversations no console do Twilio ou use apenas Messaging API.');
    } 
    
    if (basicAuthSuccess || apiKeySuccess) {
      console.log('✅ Autenticação Twilio está funcionando corretamente!');
    }
    
    console.log('=== Fim dos testes ===');
    
  } catch (error) {
    console.error('Erro inesperado durante os testes:');
    console.error(error);
  }
}

// Executar os testes
runTests();