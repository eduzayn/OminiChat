#!/usr/bin/env node

/**
 * Script para executar os testes do Twilio
 * 
 * Este script inicia os testes para verificar a conexão com a API do Twilio,
 * verificando credenciais, conversas e funcionalidades do WhatsApp.
 */

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Obter o diretório atual do script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Listagem de testes disponíveis
const tests = [
  {
    id: 1,
    file: 'twilio-connection-test.js',
    description: 'Teste básico de conexão com a API do Twilio'
  },
  {
    id: 2,
    file: 'twilio-conversations-test.js',
    description: 'Teste da API de Conversas do Twilio'
  },
  {
    id: 3, 
    file: 'twilio-whatsapp-test.js',
    description: 'Teste da API WhatsApp do Twilio'
  }
];

// Verificar se todos os arquivos de teste existem
tests.forEach(test => {
  const filePath = join(__dirname, test.file);
  if (!fs.existsSync(filePath)) {
    console.error(`⚠️ Arquivo de teste não encontrado: ${test.file}`);
    process.exit(1);
  }
});

// Carregar variáveis de ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const testNumber = process.env.TEST_WHATSAPP_NUMBER;

console.log('🔍 Verificação de configuração do Twilio');
console.log('-----------------------------------------');
console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`TWILIO_AUTH_TOKEN: ${authToken ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`TWILIO_API_KEY: ${apiKey ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`TWILIO_API_SECRET: ${apiSecret ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`TWILIO_PHONE_NUMBER: ${phoneNumber ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`TEST_WHATSAPP_NUMBER: ${testNumber ? '✅ Configurado' : '❌ Não configurado'}`);
console.log('-----------------------------------------');

// Verificar se temos o mínimo necessário para os testes
if (!accountSid || !authToken) {
  console.error('❌ ERRO: TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN são obrigatórios para os testes');
  process.exit(1);
}

// Função para executar um teste específico
function runTest(testId) {
  return new Promise((resolve, reject) => {
    const test = tests.find(t => t.id === testId);
    if (!test) {
      reject(new Error(`Teste com ID ${testId} não encontrado`));
      return;
    }
    
    console.log(`\n\n🧪 Executando teste: ${test.description}`);
    console.log('==============================================\n');
    
    const testPath = join(__dirname, test.file);
    const command = `node --experimental-modules ${testPath}`;
    
    const childProcess = exec(command);
    
    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error(`\n❌ Teste falhou com código de saída: ${code}`);
        resolve(); // Continua com o próximo teste mesmo se este falhar
      }
    });
  });
}

// Função principal
async function main() {
  console.log('🚀 Iniciando bateria de testes do Twilio');
  console.log('==============================================');
  
  try {
    // Executar teste básico de conexão primeiro
    await runTest(1);
    
    // Executar teste da API de Conversas
    await runTest(2);
    
    // Executar teste da API WhatsApp
    await runTest(3);
    
    console.log('\n\n✅ Bateria de testes concluída!');
    console.log('==============================================');
    console.log('As informações acima podem ajudar a identificar problemas com a integração do Twilio.');
    console.log('Verifique os resultados e ajuste a configuração conforme necessário.');
  } catch (error) {
    console.error('❌ Erro ao executar testes:', error.message);
    process.exit(1);
  }
}

// Executar a função principal
main();