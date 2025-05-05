/**
 * Teste direto da API do Twilio para WhatsApp (sem abstrações)
 * Com base na documentação oficial: https://www.twilio.com/docs/whatsapp/api
 */

import axios from 'axios';

// Obter as variáveis de ambiente
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const API_KEY = process.env.TWILIO_API_KEY;
const API_SECRET = process.env.TWILIO_API_SECRET;
// Aqui usamos o número do Sandbox ao invés do número normal do Twilio
const PHONE_NUMBER = process.env.SANDBOX_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;
const TEST_PHONE = process.env.TEST_WHATSAPP_NUMBER;

// Verificar as credenciais disponíveis
console.log('=== Verificação de Credenciais ===');
console.log(`TWILIO_ACCOUNT_SID: ${ACCOUNT_SID ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log(`TWILIO_AUTH_TOKEN: ${AUTH_TOKEN ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log(`TWILIO_API_KEY: ${API_KEY ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log(`TWILIO_API_SECRET: ${API_SECRET ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log(`TWILIO_PHONE_NUMBER: ${PHONE_NUMBER ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log(`TEST_WHATSAPP_NUMBER: ${TEST_PHONE ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log('===============================');

// Configurar autenticação
const authConfig = API_KEY && API_SECRET
  ? { username: API_KEY, password: API_SECRET }
  : { username: ACCOUNT_SID, password: AUTH_TOKEN };

// Verificar o status da conta
async function checkAccount() {
  try {
    console.log('\n1. Verificando detalhes da conta Twilio...');
    
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}.json`,
      { auth: authConfig }
    );
    
    console.log('✅ Conta verificada com sucesso!');
    console.log(`Nome da conta: ${response.data.friendly_name}`);
    console.log(`Status: ${response.data.status}`);
    console.log(`Tipo: ${response.data.type}`);
    console.log(`Data de criação: ${response.data.date_created}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar conta:');
    console.error(`Status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Verificar números de telefone disponíveis
async function checkPhoneNumbers() {
  try {
    console.log('\n2. Verificando números de telefone disponíveis...');
    
    const response = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/IncomingPhoneNumbers.json`,
      { auth: authConfig }
    );
    
    const numbers = response.data.incoming_phone_numbers;
    
    if (numbers && numbers.length > 0) {
      console.log(`✅ ${numbers.length} número(s) encontrado(s):`);
      
      numbers.forEach((number, index) => {
        console.log(`\n${index + 1}. Número: ${number.phone_number}`);
        console.log(`   Amigável: ${number.friendly_name}`);
        console.log(`   SID: ${number.sid}`);
        console.log(`   Tipo: ${number.capabilities.voice ? 'Voz' : ''}${number.capabilities.sms ? ' SMS' : ''}${number.capabilities.mms ? ' MMS' : ''}`);
      });
      
      // Verificar se o número de WhatsApp está entre os números
      if (PHONE_NUMBER) {
        const formattedNumber = PHONE_NUMBER.replace('whatsapp:', '').replace(/[^0-9]/g, '');
        const found = numbers.some(number => number.phone_number.replace(/[^0-9]/g, '').includes(formattedNumber));
        
        if (found) {
          console.log(`\n✅ O número ${PHONE_NUMBER} foi encontrado na sua conta.`);
        } else {
          console.log(`\n⚠️ O número ${PHONE_NUMBER} NÃO foi encontrado na sua conta.`);
          console.log('Isso pode significar que você está usando um número do Sandbox do WhatsApp.');
        }
      }
      
      return numbers;
    } else {
      console.log('⚠️ Nenhum número de telefone encontrado na conta.');
      return [];
    }
  } catch (error) {
    console.error('❌ Erro ao verificar números de telefone:');
    console.error(`Status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

// Verificar capacidade de WhatsApp específica
async function checkWhatsAppCapabilities() {
  try {
    console.log('\n3. Verificando capacidades de WhatsApp...');
    
    // Não há um endpoint específico para verificar capacidades do WhatsApp,
    // então tentamos obter informações sobre o número WhatsApp direto do endpoint de mensagens
    
    // Primeiro, vamos verificar as configurações do WhatsApp
    let whatsappEnabled = false;
    
    try {
      // Tentamos verificar se há mensagens recentes do WhatsApp
      const recentMessages = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json?PageSize=10`,
        { auth: authConfig }
      );
      
      const whatsappMessages = recentMessages.data.messages.filter(
        msg => msg.to?.startsWith('whatsapp:') || msg.from?.startsWith('whatsapp:')
      );
      
      if (whatsappMessages.length > 0) {
        console.log(`✅ ${whatsappMessages.length} mensagens WhatsApp encontradas nas mensagens recentes.`);
        whatsappEnabled = true;
      } else {
        console.log('⚠️ Nenhuma mensagem WhatsApp recente encontrada.');
      }
    } catch (error) {
      console.log('⚠️ Não foi possível verificar mensagens recentes.');
    }
    
    // Verificar se temos número no formato WhatsApp
    if (PHONE_NUMBER) {
      if (PHONE_NUMBER.startsWith('whatsapp:')) {
        console.log(`✅ O número ${PHONE_NUMBER} está no formato correto para WhatsApp.`);
        whatsappEnabled = true;
      } else {
        console.log(`⚠️ O número ${PHONE_NUMBER} não está no formato 'whatsapp:+XXXX' esperado.`);
        console.log(`   Formato recomendado: whatsapp:+${PHONE_NUMBER.replace(/^\+/, '')}`);
      }
    } else {
      console.log('❌ Nenhum número de telefone (TWILIO_PHONE_NUMBER) configurado.');
    }
    
    // Status final
    if (whatsappEnabled) {
      console.log('✅ Capacidade de WhatsApp detectada na conta.');
    } else {
      console.log('⚠️ Não foi possível confirmar a capacidade de WhatsApp na conta.');
      console.log('   Isso não significa que não está habilitado, apenas que não conseguimos detectar automaticamente.');
      console.log('   Se você tem certeza que sua conta tem acesso ao WhatsApp, pode ignorar este aviso.');
    }
    
    return whatsappEnabled;
  } catch (error) {
    console.error('❌ Erro ao verificar capacidades de WhatsApp:');
    console.error(`Mensagem: ${error.message}`);
    return false;
  }
}

// Tentar enviar uma mensagem de WhatsApp diretamente
async function sendDirectWhatsAppMessage() {
  if (!TEST_PHONE) {
    console.log('\n4. Pulando teste de envio de mensagem (TEST_WHATSAPP_NUMBER não configurado)');
    return false;
  }
  
  if (!PHONE_NUMBER) {
    console.log('\n4. Pulando teste de envio de mensagem (TWILIO_PHONE_NUMBER não configurado)');
    return false;
  }
  
  console.log('\n4. Tentando enviar mensagem WhatsApp diretamente...');
  
  // Garantir que os números estão no formato correto para WhatsApp
  const fromNumber = PHONE_NUMBER.startsWith('whatsapp:')
    ? PHONE_NUMBER
    : `whatsapp:+${PHONE_NUMBER.replace(/^\+/, '')}`;
  
  const toNumber = TEST_PHONE.startsWith('whatsapp:')
    ? TEST_PHONE
    : `whatsapp:+${TEST_PHONE.replace(/^\+/, '')}`;
  
  try {
    console.log(`Enviando mensagem de ${fromNumber} para ${toNumber}...`);
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: `Teste da API WhatsApp do OmniConnect - ${new Date().toLocaleString('pt-BR')}`
      }),
      { auth: authConfig }
    );
    
    if (response.data.sid) {
      console.log('✅ Mensagem WhatsApp enviada com sucesso!');
      console.log(`SID da mensagem: ${response.data.sid}`);
      console.log(`Status: ${response.data.status}`);
      console.log(`Preço: ${response.data.price || 'N/A'}`);
      console.log(`Erro (se houver): ${response.data.error_message || 'Nenhum erro'}`);
      return true;
    } else {
      console.log('❌ Falha ao enviar mensagem WhatsApp (resposta sem SID)');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:');
    console.error(`Status: ${error.response?.status || 'Desconhecido'}`);
    console.error(`Mensagem: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.data?.code === 21211) {
      console.error('⚠️ Este erro geralmente significa que o número de telefone de destino é inválido.');
    } else if (error.response?.data?.code === 21608) {
      console.error('⚠️ Este erro indica que o WhatsApp não está configurado para este número de telefone.');
      console.error('Por favor, verifique se você ativou o WhatsApp para este número no console do Twilio.');
    } else if (error.response?.data?.code === 63018) {
      console.error('⚠️ Este erro indica que o destinatário não aceitou o template pre-aprovado do sandbox do WhatsApp.');
      console.error('O usuário precisa enviar a mensagem de ativação para o seu número do Sandbox primeiro.');
    }
    
    return false;
  }
}

// Mostrar informações sobre a configuração do WhatsApp no Twilio
function showTwilioWhatsAppInfo() {
  console.log('\n============================================');
  console.log('INFORMAÇÕES SOBRE WHATSAPP NO TWILIO');
  console.log('============================================');
  console.log('Para utilizar o WhatsApp com o Twilio, você tem duas opções:');
  console.log('\n1. Sandbox do WhatsApp (para testes)');
  console.log('   - Gratuito para testes');
  console.log('   - Limitado a mensagens para números que foram pré-registrados');
  console.log('   - Disponível em: https://www.twilio.com/console/sms/whatsapp/learn');
  console.log('   - O destinatário precisa enviar uma mensagem JOIN palavra-código para ativar');
  
  console.log('\n2. WhatsApp Business API (para produção)');
  console.log('   - Requer aprovação do Facebook/Meta');
  console.log('   - Permite enviar mensagens para qualquer número do WhatsApp');
  console.log('   - Requer templates aprovados para iniciar conversas');
  console.log('   - Mais informações: https://www.twilio.com/docs/whatsapp/tutorial/connect-number-business-profile');
  
  console.log('\nPARA CONFIGURAR O SANDBOX:');
  console.log('1. Acesse https://www.twilio.com/console/sms/whatsapp/learn');
  console.log('2. Siga as instruções para configurar o sandbox');
  console.log('3. Use o número fornecido no formato whatsapp:+14155238886');
  console.log('4. Configure seu webhook para receber mensagens');
  
  console.log('\nIMPORTANTE:');
  console.log('- Os números WhatsApp SEMPRE devem começar com "whatsapp:" seguido do número com código do país');
  console.log('- Exemplo: whatsapp:+5511999991234');
  console.log('- Para testes, o destinatário precisa enviar a palavra-código de ativação para o seu número do Sandbox');
  console.log('============================================');
}

// Sugerir próximos passos baseado nos resultados dos testes
function suggestNextSteps(accountOk, hasNumbers, whatsappEnabled, messageSent) {
  console.log('\n============================================');
  console.log('RECOMENDAÇÕES BASEADAS NOS TESTES');
  console.log('============================================');
  
  if (!accountOk) {
    console.log('❌ Verifique suas credenciais do Twilio (ACCOUNT_SID e AUTH_TOKEN ou API_KEY e API_SECRET)');
    console.log('   Acesse https://www.twilio.com/console e confirme se os valores estão corretos');
    return;
  }
  
  if (!hasNumbers || hasNumbers.length === 0) {
    console.log('❌ Sua conta não tem números de telefone configurados');
    console.log('   Compre um número em https://www.twilio.com/console/phone-numbers/search');
    return;
  }
  
  if (!PHONE_NUMBER) {
    console.log('❌ Configure a variável TWILIO_PHONE_NUMBER com o número do WhatsApp');
    console.log('   Para o Sandbox, use o formato: whatsapp:+14155238886');
    return;
  }
  
  if (!whatsappEnabled) {
    console.log('⚠️ Não confirmamos que o WhatsApp está habilitado na sua conta');
    console.log('   Acesse https://www.twilio.com/console/sms/whatsapp/learn para configurar o Sandbox');
    console.log('   Ou solicite acesso à API Business em https://www.twilio.com/whatsapp/request-access');
  }
  
  if (!messageSent && TEST_PHONE) {
    console.log('❌ Não conseguimos enviar uma mensagem WhatsApp de teste');
    if (PHONE_NUMBER.startsWith('whatsapp:')) {
      console.log('   Verifique se o número de teste já enviou a mensagem de ativação para o seu número do Sandbox');
      console.log('   Para o Sandbox, o destinatário precisa enviar: JOIN <palavra-código>');
    } else {
      console.log('   Seu número não está no formato correto para WhatsApp');
      console.log('   Use o formato: whatsapp:+14155238886');
    }
  }
  
  if (accountOk && hasNumbers && hasNumbers.length > 0 && whatsappEnabled && messageSent) {
    console.log('✅ Sua configuração do WhatsApp com o Twilio parece estar funcionando corretamente!');
    console.log('   Você pode continuar com a integração na aplicação');
  } else {
    console.log('\nDicas gerais:');
    console.log('1. Para o Sandbox do WhatsApp, os números devem começar com "whatsapp:"');
    console.log('2. Os destinatários precisam enviar a mensagem de ativação primeiro');
    console.log('3. Verifique a documentação em https://www.twilio.com/docs/whatsapp');
  }
  
  console.log('============================================');
}

// Executar todos os testes
async function runAllTests() {
  console.log('=== INICIANDO TESTES DA API TWILIO PARA WHATSAPP ===');
  
  // 1. Verificar a conta
  const accountOk = await checkAccount();
  
  // 2. Verificar números disponíveis
  const numbers = await checkPhoneNumbers();
  const hasNumbers = numbers && numbers.length > 0;
  
  // 3. Verificar capacidades do WhatsApp
  const whatsappEnabled = await checkWhatsAppCapabilities();
  
  // 4. Testar envio de mensagem WhatsApp
  const messageSent = await sendDirectWhatsAppMessage();
  
  // 5. Mostrar informações sobre WhatsApp no Twilio
  showTwilioWhatsAppInfo();
  
  // 6. Sugerir próximos passos
  suggestNextSteps(accountOk, hasNumbers, whatsappEnabled, messageSent);
  
  console.log('\n=== TESTES CONCLUÍDOS ===');
}

// Iniciar os testes
runAllTests();