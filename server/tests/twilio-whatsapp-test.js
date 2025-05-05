/**
 * Teste específico para a API WhatsApp do Twilio
 * 
 * Baseado na documentação:
 * - https://www.twilio.com/docs/whatsapp/api
 * - https://www.twilio.com/docs/whatsapp/quickstart
 */

const axios = require('axios');

// Obter as variáveis de ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Iniciando teste da API WhatsApp do Twilio');
console.log('-----------------------------------------');
console.log(`TWILIO_ACCOUNT_SID está definido: ${Boolean(accountSid)}`);
console.log(`TWILIO_AUTH_TOKEN está definido: ${Boolean(authToken)}`);
console.log(`TWILIO_API_KEY está definido: ${Boolean(apiKey)}`);
console.log(`TWILIO_PHONE_NUMBER está definido: ${Boolean(phoneNumber)}`);
console.log('-----------------------------------------');

// Configurar autenticação - preferir API Key se disponível
const auth = apiKey ? 
  { username: apiKey, password: apiSecret } : 
  { username: accountSid, password: authToken };

// Verificar o status da conta Twilio
async function checkAccountStatus() {
  console.log('Verificando status da conta Twilio');
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      { auth }
    );
    
    console.log('✅ Autenticação com Twilio: SUCESSO');
    console.log(`Nome da conta: ${response.data.friendly_name}`);
    console.log(`Status da conta: ${response.data.status}`);
    
    if (response.data.status !== 'active') {
      console.warn(`⚠️ A conta Twilio não está ativa (status: ${response.data.status}).`);
      console.warn('Isso pode afetar a capacidade de enviar mensagens.');
    }
    
    return response.data.status === 'active';
  } catch (error) {
    console.error('❌ Erro ao verificar status da conta:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Verificar se o número de telefone para WhatsApp está configurado
async function checkWhatsAppNumber() {
  console.log('Verificando número WhatsApp do Twilio');
  
  if (!phoneNumber) {
    console.error('❌ Número de telefone (TWILIO_PHONE_NUMBER) não está definido');
    return false;
  }
  
  // Remover o prefixo "whatsapp:" se existir
  const cleanPhoneNumber = phoneNumber.replace('whatsapp:', '').replace(/^\+/, '');
  
  try {
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      { auth }
    );
    
    const phoneNumbers = response.data.incoming_phone_numbers;
    
    console.log(`Total de números na conta: ${phoneNumbers.length}`);
    
    // Verificar se o número específico está na lista
    const phoneFound = phoneNumbers.some(phone => {
      return phone.phone_number.includes(cleanPhoneNumber) || 
             phone.phone_number.replace(/[^\d]/g, '').includes(cleanPhoneNumber.replace(/[^\d]/g, ''));
    });
    
    if (phoneFound) {
      console.log(`✅ O número ${cleanPhoneNumber} está configurado na sua conta Twilio`);
      return true;
    } else {
      console.warn(`⚠️ O número ${cleanPhoneNumber} não foi encontrado na sua conta Twilio`);
      console.warn('Isso pode indicar um problema com a configuração do número');
      
      // Mostrar os números disponíveis para ajudar o usuário
      console.log('Números disponíveis na sua conta:');
      phoneNumbers.forEach((phone, index) => {
        console.log(`${index + 1}. ${phone.friendly_name || 'Sem nome'}: ${phone.phone_number}`);
      });
      
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar números de telefone:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Verificar a capacidade de WhatsApp
async function checkWhatsAppCapability() {
  console.log('Verificando capacidade de WhatsApp');
  
  try {
    // Para verificar se a conta tem capacidade de WhatsApp, verificamos a existência
    // de mensagens de template para WhatsApp (uma forma indireta de verificação)
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=20`,
      { auth }
    );
    
    const messages = response.data.messages;
    const whatsappMessages = messages.filter(msg => 
      msg.to?.startsWith('whatsapp:') || msg.from?.startsWith('whatsapp:')
    );
    
    if (whatsappMessages.length > 0) {
      console.log('✅ WhatsApp está ativo na sua conta Twilio');
      console.log(`Encontradas ${whatsappMessages.length} mensagens WhatsApp recentes`);
      return true;
    } else {
      console.warn('⚠️ Não foram encontradas mensagens WhatsApp recentes');
      console.warn('Isso pode significar que o WhatsApp não está configurado ou não está sendo usado');
      
      // Verificar se há alguma mensagem recente de qualquer tipo
      if (messages.length > 0) {
        console.log(`Foram encontradas ${messages.length} mensagens regulares (não WhatsApp)`);
      } else {
        console.log('Não foram encontradas mensagens recentes de nenhum tipo');
      }
      
      // Não podemos confirmar positivamente nem negativamente
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar capacidade de WhatsApp:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Verificar a configuração do Sandbox do WhatsApp (se aplicável)
async function checkWhatsAppSandbox() {
  console.log('Verificando configuração do Sandbox do WhatsApp');
  
  // O Twilio não tem um endpoint direto para verificar a configuração do Sandbox
  // Podemos verificar indiretamente através da lista de mensagens
  
  try {
    // Verificar as configurações de Messaging Services que podem incluir WhatsApp
    const servicesResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messaging/Services.json`,
      { auth }
    );
    
    const services = servicesResponse.data.services;
    console.log(`Serviços de mensagens encontrados: ${services.length}`);
    
    let whatsappService = null;
    
    // Procurar por serviços que possam estar configurados para WhatsApp
    for (const service of services) {
      try {
        const phoneResponse = await axios.get(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messaging/Services/${service.sid}/PhoneNumbers.json`,
          { auth }
        );
        
        const phoneNumbers = phoneResponse.data.phone_numbers;
        
        for (const phone of phoneNumbers) {
          if (phone.capabilities && phone.capabilities.whatsapp) {
            whatsappService = service;
            console.log('✅ Encontrado serviço de mensagens configurado para WhatsApp:');
            console.log(`- Nome: ${service.friendly_name}`);
            console.log(`- SID: ${service.sid}`);
            break;
          }
        }
        
        if (whatsappService) break;
        
      } catch (error) {
        // Ignorar erros ao verificar números individuais
        continue;
      }
    }
    
    if (!whatsappService) {
      console.warn('⚠️ Não foi encontrado nenhum serviço explícito para WhatsApp');
      console.warn('Isso é normal se você estiver usando o Sandbox do WhatsApp');
    }
    
    // Verificar se o número tem formato de sandbox do WhatsApp
    if (phoneNumber && phoneNumber.includes('whatsapp:')) {
      console.log('✅ O número do WhatsApp está no formato correto (whatsapp:+XXXXXXXXXX)');
      return true;
    } else if (phoneNumber) {
      console.warn('⚠️ O número de telefone não está no formato WhatsApp');
      console.warn(`Formato atual: ${phoneNumber}`);
      console.warn('Formato esperado: whatsapp:+XXXXXXXXXX');
      return false;
    } else {
      console.error('❌ Número de telefone não configurado');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar configuração do Sandbox:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Testar o envio de uma mensagem WhatsApp (apenas se tivermos um número de teste)
async function testSendWhatsAppMessage() {
  const testNumber = process.env.TEST_WHATSAPP_NUMBER;
  
  if (!testNumber) {
    console.log('ℹ️ Variável TEST_WHATSAPP_NUMBER não está definida');
    console.log('Pulando teste de envio de mensagem WhatsApp');
    console.log('Para testar o envio, defina TEST_WHATSAPP_NUMBER com um número válido');
    return null;
  }
  
  if (!phoneNumber) {
    console.error('❌ TWILIO_PHONE_NUMBER não está definido');
    return false;
  }
  
  console.log(`Testando envio de mensagem WhatsApp para ${testNumber}`);
  
  // Garantir que os números estejam no formato correto para WhatsApp
  const fromNumber = phoneNumber.startsWith('whatsapp:') ? 
    phoneNumber : `whatsapp:+${phoneNumber.replace(/^\+/, '')}`;
    
  const toNumber = testNumber.startsWith('whatsapp:') ? 
    testNumber : `whatsapp:+${testNumber.replace(/^\+/, '')}`;
  
  try {
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: `Teste de integração OmniConnect. Hora: ${new Date().toLocaleString('pt-BR')}`
      }),
      { auth }
    );
    
    if (response.data && response.data.sid) {
      console.log('✅ Mensagem WhatsApp enviada com sucesso!');
      console.log(`SID da mensagem: ${response.data.sid}`);
      console.log(`Status: ${response.data.status}`);
      return true;
    } else {
      console.error('❌ Falha ao enviar mensagem WhatsApp');
      console.error('Resposta não contém SID da mensagem');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:');
    console.error(`Código de status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem de erro: ${error.response?.data?.message || error.message}`);
    
    // Verificar erros específicos do WhatsApp
    if (error.response?.data?.code === 63018) {
      console.warn('⚠️ Este erro pode indicar que o número de destino não está registrado no Sandbox');
      console.warn('O destinatário precisa enviar a mensagem de registro para o seu número do Sandbox primeiro');
    }
    
    return false;
  }
}

// Executar os testes
async function runTests() {
  try {
    console.log('=== Iniciando testes da API WhatsApp do Twilio ===');
    
    // Teste 1: Verificar status da conta
    const accountActive = await checkAccountStatus();
    console.log('-----------------------------------------');
    
    // Teste 2: Verificar número de telefone
    const phoneValid = await checkWhatsAppNumber();
    console.log('-----------------------------------------');
    
    // Teste 3: Verificar capacidade de WhatsApp
    const whatsappCapable = await checkWhatsAppCapability();
    console.log('-----------------------------------------');
    
    // Teste 4: Verificar configuração do Sandbox
    const sandboxConfigured = await checkWhatsAppSandbox();
    console.log('-----------------------------------------');
    
    // Teste 5: Testar envio de mensagem (opcional)
    const messageSent = await testSendWhatsAppMessage();
    console.log('-----------------------------------------');
    
    // Resumo dos resultados
    console.log('=== Resumo dos testes de WhatsApp do Twilio ===');
    console.log(`Status da conta: ${accountActive ? '✅ ATIVA' : '❌ INATIVA'}`);
    console.log(`Número de telefone válido: ${phoneValid ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`Capacidade WhatsApp: ${
      whatsappCapable === true ? '✅ CONFIRMADA' : 
      whatsappCapable === false ? '❌ NÃO ENCONTRADA' : 
      '⚠️ INCONCLUSIVA'
    }`);
    console.log(`Configuração do Sandbox: ${sandboxConfigured ? '✅ CORRETA' : '❌ PROBLEMAS'}`);
    
    if (messageSent !== null) {
      console.log(`Envio de mensagem de teste: ${messageSent ? '✅ SUCESSO' : '❌ FALHA'}`);
    }
    
    // Recomendações
    console.log('-----------------------------------------');
    console.log('Recomendações:');
    
    if (!accountActive) {
      console.log('❌ Ative sua conta Twilio ou verifique suas credenciais.');
    }
    
    if (!phoneValid) {
      console.log('❌ Configure um número de telefone válido para WhatsApp no Twilio.');
      console.log('   Acesse: https://www.twilio.com/console/sms/whatsapp/learn');
    }
    
    if (whatsappCapable === false) {
      console.log('❌ Ative a capacidade de WhatsApp na sua conta Twilio.');
      console.log('   Acesse: https://www.twilio.com/console/sms/whatsapp/learn');
    }
    
    if (!sandboxConfigured) {
      console.log('❌ Configure corretamente o Sandbox do WhatsApp.');
      console.log('   O número deve estar no formato: whatsapp:+1234567890');
    }
    
    if (accountActive && phoneValid && whatsappCapable !== false && sandboxConfigured) {
      console.log('✅ Sua configuração de WhatsApp no Twilio parece estar correta!');
      console.log('   Você pode usar a API para enviar e receber mensagens WhatsApp.');
    }
    
    console.log('=== Fim dos testes ===');
    
  } catch (error) {
    console.error('Erro inesperado durante os testes:');
    console.error(error);
  }
}

// Executar os testes
runTests();