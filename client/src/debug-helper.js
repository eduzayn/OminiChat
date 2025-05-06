// Este script é para auxiliar na depuração da mensagem Z-API
// Injetar no browser via console para localizar a fonte da mensagem

// Salvar a função console.log original
const originalConsoleLog = console.log;

// Sobrescrever console.log para interceptar mensagens específicas
console.log = function(...args) {
  // Verificar se há menção ao Z-API na mensagem
  const messageStr = args.map(a => String(a)).join(' ');
  if (messageStr.includes('Z-API') || messageStr.includes('zapi')) {
    console.warn('!!!!! INTERCEPTED Z-API MESSAGE !!!!');
    console.warn('Argumentos:', ...args);
    console.warn('Call stack:', new Error().stack);
  }
  
  // Chamar o console.log original
  return originalConsoleLog.apply(console, args);
};

console.info('Console.log interceptor ativado!');