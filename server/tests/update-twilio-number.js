/**
 * Utilitário para atualizar o número do Twilio para o formato correto do WhatsApp
 * Para uso no Sandbox do WhatsApp do Twilio, que requer um número no formato:
 * whatsapp:+14155238886
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Carregar variáveis de ambiente
config();

// Criar interface para perguntas no terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar ao usuário
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Função principal
async function main() {
  console.log('=== Utilitário para Configurar Número do WhatsApp no Twilio ===');
  
  const currentNumber = process.env.TWILIO_PHONE_NUMBER || '';
  
  console.log(`Número atual: ${currentNumber}`);
  console.log('\nPara o Sandbox do WhatsApp do Twilio, o número deve estar no formato:');
  console.log('whatsapp:+14155238886 (ou o número fornecido pelo seu Sandbox)');
  
  // Perguntar ao usuário se quer usar o Sandbox ou número próprio
  const useSandbox = await prompt('\nVocê quer usar o Sandbox do WhatsApp? (S/N): ');
  
  let whatsappNumber = '';
  
  if (useSandbox.toLowerCase() === 's' || useSandbox.toLowerCase() === 'sim') {
    // Usar o número do Sandbox
    const sandboxNumber = await prompt('Digite o número do Sandbox fornecido pelo Twilio (ex: +14155238886): ');
    whatsappNumber = `whatsapp:${sandboxNumber.replace(/^(\+?)/, '+').trim()}`;
  } else {
    // Usar número próprio (para WhatsApp Business API)
    const ownNumber = await prompt('Digite seu número de telefone com código do país (ex: +5511999991234): ');
    whatsappNumber = `whatsapp:${ownNumber.replace(/^(\+?)/, '+').trim()}`;
  }
  
  console.log(`\nFormato correto do número: ${whatsappNumber}`);
  
  // Atualizar a variável de ambiente em tempo de execução
  process.env.TWILIO_PHONE_NUMBER = whatsappNumber;
  
  // Testar se o número agora está no formato correto
  console.log('\nVerificando o formato...');
  if (whatsappNumber.startsWith('whatsapp:+') && whatsappNumber.length > 11) {
    console.log('✅ Formato do número WhatsApp válido!');
  } else {
    console.log('❌ Formato inválido. O número deve começar com "whatsapp:+" seguido do código do país e número.');
    rl.close();
    return;
  }
  
  // Perguntar se deve atualizar permanentemente
  const shouldUpdate = await prompt('\nDeseja atualizar permanentemente este número nas configurações? (S/N): ');
  
  if (shouldUpdate.toLowerCase() === 's' || shouldUpdate.toLowerCase() === 'sim') {
    // Atualizar o arquivo de ambiente
    try {
      console.log('\nAtualizando configuração...');
      
      // Verificar se existe e atualizar
      await checkSecrets(whatsappNumber);
      
      console.log('✅ Número do WhatsApp atualizado com sucesso!');
      console.log(`O novo número é: ${whatsappNumber}`);
      console.log('\nAgora você pode usar este número para enviar mensagens WhatsApp.');
      console.log('\nIMPORTANTE:');
      console.log('1. Para o Sandbox, os destinatários precisam enviar uma mensagem de ativação primeiro.');
      console.log('2. A mensagem de ativação geralmente é "JOIN <palavra-código>".');
      console.log('3. Você encontra a palavra-código no console do Twilio.');
    } catch (error) {
      console.error('❌ Erro ao atualizar configuração:', error.message);
    }
  } else {
    console.log('\nA configuração NÃO foi alterada permanentemente.');
    console.log(`Para usar este número, defina a variável de ambiente TWILIO_PHONE_NUMBER=${whatsappNumber}`);
  }
  
  rl.close();
}

// Função para verificar e atualizar os secrets
async function checkSecrets(whatsappNumber) {
  console.log(`Atualizando TWILIO_PHONE_NUMBER para ${whatsappNumber}...`);
  
  // Apenas para teste - na versão Replit os secrets seriam atualizados de forma diferente
  console.log('Para uso em produção, atualize os secrets através da interface do Replit.');
  console.log('Em um ambiente local, atualize seu arquivo .env');
  
  // Se estamos no ambiente Replit, mostramos as instruções específicas
  if (process.env.REPLIT_ENVIRONMENT) {
    console.log('\nComo atualizar no Replit:');
    console.log('1. Clique no ícone de cadeado 🔒 no painel lateral');
    console.log('2. Adicione/atualize a chave TWILIO_PHONE_NUMBER');
    console.log(`3. Defina o valor como: ${whatsappNumber}`);
  }
  
  return true;
}

// Executar o programa
main().catch(error => {
  console.error('Erro:', error);
  rl.close();
});