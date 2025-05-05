/**
 * Teste específico para a API de Conversas do Twilio (Twilio Conversations)
 * 
 * Baseado na documentação:
 * - https://www.twilio.com/docs/conversations/api
 * - https://www.twilio.com/docs/conversations/api/conversation-resource
 * - https://www.twilio.com/docs/conversations/api/service-resource
 */

import axios from 'axios';

// Obter as variáveis de ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN;

console.log('Iniciando teste da API de Conversas do Twilio (Twilio Conversations)');
console.log('-----------------------------------------');
console.log(`TWILIO_ACCOUNT_SID está definido: ${Boolean(accountSid)}`);
console.log(`TWILIO_AUTH_TOKEN está definido: ${Boolean(authToken)}`);
console.log(`TWILIO_API_KEY está definido: ${Boolean(apiKey)}`);
console.log('-----------------------------------------');

// Configurar autenticação - preferir API Key se disponível
const auth = apiKey ? 
  { username: apiKey, password: apiSecret } : 
  { username: accountSid, password: authToken };

// Verificar se o serviço Conversations está ativado
async function checkConversationsService() {
  console.log('Verificando se o serviço Conversations está ativado');
  
  try {
    // Endpoint para listar todos os serviços de Conversations
    // Documentação: https://www.twilio.com/docs/conversations/api/service-resource
    const response = await axios.get(
      `https://conversations.twilio.com/v1/Services`,
      { auth }
    );
    
    const services = response.data.services;
    
    if (services && services.length > 0) {
      console.log('✅ Serviço Conversations está ativo!');
      console.log(`Número de serviços disponíveis: ${services.length}`);
      console.log('Detalhes do serviço padrão:');
      console.log(`- SID: ${services[0].sid}`);
      console.log(`- Nome amigável: ${services[0].friendly_name}`);
      console.log(`- Data de criação: ${services[0].date_created}`);
      return services[0].sid; // Retorna o SID do primeiro serviço para uso futuro
    } else {
      console.log('⚠️ Nenhum serviço Conversations encontrado.');
      console.log('Você pode precisar criar um serviço no Console do Twilio.');
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('❌ Falha na autenticação. Verifique suas credenciais.');
    } else if (error.response && error.response.status === 404) {
      console.error('❌ API de Conversations não disponível. O serviço pode não estar ativado.');
      console.error('Por favor, ative o serviço Conversations no Console do Twilio.');
    } else {
      console.error('❌ Erro ao verificar o serviço Conversations:');
      console.error(error.response?.data?.message || error.message);
    }
    return null;
  }
}

// Listar conversas existentes
async function listConversations() {
  console.log('Listando conversas existentes');
  
  try {
    const response = await axios.get(
      'https://conversations.twilio.com/v1/Conversations',
      { auth }
    );
    
    const conversations = response.data.conversations;
    
    if (conversations && conversations.length > 0) {
      console.log('✅ Conversas encontradas!');
      console.log(`Total de conversas: ${conversations.length}`);
      
      // Mostrar detalhes de até 5 conversas
      const limit = Math.min(conversations.length, 5);
      console.log(`Exibindo detalhes das ${limit} primeiras conversas:`);
      
      for (let i = 0; i < limit; i++) {
        const conversation = conversations[i];
        console.log(`\nConversa ${i+1}:`);
        console.log(`- SID: ${conversation.sid}`);
        console.log(`- Nome amigável: ${conversation.friendly_name || 'Não definido'}`);
        console.log(`- Data de criação: ${conversation.date_created}`);
        console.log(`- Criada por: ${conversation.created_by || 'Desconhecido'}`);
      }
    } else {
      console.log('ℹ️ Nenhuma conversa encontrada.');
      console.log('Isso é normal se você ainda não criou nenhuma conversa.');
    }
    
    return conversations || [];
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('❌ Falha na autenticação. Verifique suas credenciais.');
    } else {
      console.error('❌ Erro ao listar conversas:');
      console.error(error.response?.data?.message || error.message);
    }
    return [];
  }
}

// Testar a criação de uma conversa
async function testCreateConversation() {
  console.log('Testando a criação de uma conversa');
  
  try {
    const testConversationName = `Teste OmniConnect ${new Date().toISOString()}`;
    
    const response = await axios.post(
      'https://conversations.twilio.com/v1/Conversations',
      {
        FriendlyName: testConversationName
      },
      { auth }
    );
    
    console.log('✅ Conversa criada com sucesso!');
    console.log('Detalhes da conversa:');
    console.log(`- SID: ${response.data.sid}`);
    console.log(`- Nome amigável: ${response.data.friendly_name}`);
    console.log(`- Data de criação: ${response.data.date_created}`);
    
    return response.data.sid;
  } catch (error) {
    console.error('❌ Erro ao criar conversa:');
    console.error(error.response?.data?.message || error.message);
    return null;
  }
}

// Testar o envio de uma mensagem para uma conversa
async function testSendMessage(conversationSid) {
  console.log(`Testando o envio de mensagem para a conversa ${conversationSid}`);
  
  if (!conversationSid) {
    console.error('❌ SID da conversa não fornecido. Pulando teste de envio de mensagem.');
    return false;
  }
  
  try {
    const response = await axios.post(
      `https://conversations.twilio.com/v1/Conversations/${conversationSid}/Messages`,
      {
        Author: 'TestSystem',
        Body: `Mensagem de teste enviada em ${new Date().toLocaleString('pt-BR')}`
      },
      { auth }
    );
    
    console.log('✅ Mensagem enviada com sucesso!');
    console.log('Detalhes da mensagem:');
    console.log(`- SID: ${response.data.sid}`);
    console.log(`- Autor: ${response.data.author}`);
    console.log(`- Corpo: ${response.data.body}`);
    console.log(`- Data: ${response.data.date_created}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Testar a adição de um participante à conversa (WhatsApp)
async function testAddParticipant(conversationSid, identity) {
  console.log(`Testando a adição de participante à conversa ${conversationSid}`);
  
  if (!conversationSid) {
    console.error('❌ SID da conversa não fornecido. Pulando teste de adição de participante.');
    return false;
  }
  
  const testIdentity = identity || `test_user_${Math.floor(Math.random() * 10000)}`;
  
  try {
    const response = await axios.post(
      `https://conversations.twilio.com/v1/Conversations/${conversationSid}/Participants`,
      {
        Identity: testIdentity
      },
      { auth }
    );
    
    console.log('✅ Participante adicionado com sucesso!');
    console.log('Detalhes do participante:');
    console.log(`- SID: ${response.data.sid}`);
    console.log(`- Identity: ${response.data.identity}`);
    console.log(`- Data de adição: ${response.data.date_created}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar participante:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Testar a exclusão de uma conversa (limpeza)
async function testDeleteConversation(conversationSid) {
  console.log(`Testando a exclusão da conversa ${conversationSid}`);
  
  if (!conversationSid) {
    console.error('❌ SID da conversa não fornecido. Pulando teste de exclusão.');
    return false;
  }
  
  try {
    await axios.delete(
      `https://conversations.twilio.com/v1/Conversations/${conversationSid}`,
      { auth }
    );
    
    console.log('✅ Conversa excluída com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao excluir conversa:');
    console.error(error.response?.data?.message || error.message);
    return false;
  }
}

// Executar os testes
async function runTests() {
  try {
    console.log('=== Iniciando testes da API Twilio Conversations ===');
    
    // Teste 1: Verificar serviço Conversations
    const serviceSid = await checkConversationsService();
    console.log('-----------------------------------------');
    
    if (!serviceSid) {
      console.log('⚠️ Sem serviço Conversations ativo. Alguns testes podem falhar.');
    }
    
    // Teste 2: Listar conversas existentes
    const existingConversations = await listConversations();
    console.log('-----------------------------------------');
    
    // Teste 3: Criar uma conversa
    const conversationSid = await testCreateConversation();
    console.log('-----------------------------------------');
    
    // Teste 4: Enviar mensagem (se conversa foi criada)
    if (conversationSid) {
      await testSendMessage(conversationSid);
      console.log('-----------------------------------------');
    }
    
    // Teste 5: Adicionar participante (se conversa foi criada)
    if (conversationSid) {
      await testAddParticipant(conversationSid);
      console.log('-----------------------------------------');
    }
    
    // Teste 6: Excluir a conversa de teste (limpeza)
    if (conversationSid) {
      await testDeleteConversation(conversationSid);
      console.log('-----------------------------------------');
    }
    
    // Sumário
    console.log('=== Resumo dos testes da API Twilio Conversations ===');
    console.log(`Serviço Conversations: ${serviceSid ? '✅ ATIVO' : '❌ INATIVO/INDISPONÍVEL'}`);
    console.log(`Conversas existentes: ${existingConversations.length}`);
    console.log(`Criação de conversa: ${conversationSid ? '✅ SUCESSO' : '❌ FALHA'}`);
    
    // Recomendações
    console.log('-----------------------------------------');
    console.log('Recomendações:');
    
    if (!serviceSid) {
      console.log('❌ Ative o serviço Twilio Conversations no Console do Twilio.');
      console.log('   Acesse: https://www.twilio.com/console/conversations');
    }
    
    if (!conversationSid) {
      console.log('❌ Verifique as permissões da sua conta Twilio.');
      console.log('   Certifique-se de que a API Keys tem permissão para usar Conversations.');
    }
    
    if (serviceSid && conversationSid) {
      console.log('✅ O serviço Twilio Conversations está configurado corretamente!');
      console.log('   Você pode usar a API para criar e gerenciar conversas.');
    }
    
    console.log('=== Fim dos testes ===');
    
  } catch (error) {
    console.error('Erro inesperado durante os testes:');
    console.error(error);
  }
}

// Executar os testes
runTests();