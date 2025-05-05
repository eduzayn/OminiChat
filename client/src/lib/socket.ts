/**
 * Cria uma conexão WebSocket com o servidor, com opções avançadas de tratamento de eventos
 * @returns {WebSocket} A instância de WebSocket criada
 */
export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Construir a URL do WebSocket corretamente
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  // Criar o socket
  const socket = new WebSocket(wsUrl);
  
  // Configurar os handlers de eventos básicos
  socket.onopen = (event) => {
    console.log("Conexão WebSocket estabelecida");
    // Inicializar contagem de ping/pongs
    (socket as any).pingPongActive = true;
    (socket as any).missedPings = 0;
  };
  
  socket.onclose = (event) => {
    // Código 1000 = fechamento normal, qualquer outro é potencialmente um erro
    if (event.code !== 1000) {
      console.log(`Conexão WebSocket fechada com código: ${event.code}, razão: ${event.reason}`);
    } else {
      console.log("Conexão WebSocket fechada normalmente");
    }
    
    // Desativar o ping/pong
    (socket as any).pingPongActive = false;
  };
  
  socket.onerror = (error) => {
    console.error("Erro na conexão WebSocket:", error);
  };
  
  // Adicionar suporte a ping/pong para detecção de conexão perdida
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      // Resetar contador de pings perdidos quando qualquer mensagem válida é recebida
      if (data && typeof data === 'object') {
        (socket as any).missedPings = 0;
      }
    } catch (e) {
      // Possivelmente uma mensagem que não é JSON (como um ping)
    }
  });
  
  // Criar um ping interno para verificar a saúde da conexão
  const pingInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN && (socket as any).pingPongActive) {
      // Enviar um ping através de uma mensagem JSON para compatibilidade
      try {
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        (socket as any).missedPings++;
        
        // Se mais de 3 pings forem perdidos, a conexão provavelmente está morta
        if ((socket as any).missedPings > 3) {
          console.warn("Conexão WebSocket parece estar morta - vários pings perdidos");
          socket.close(4000, "Conexão inativa detectada");
          clearInterval(pingInterval);
        }
      } catch (e) {
        console.error("Erro ao enviar ping:", e);
        clearInterval(pingInterval);
      }
    } else if (!((socket as any).pingPongActive)) {
      // Limpeza - parar o intervalo se a conexão foi fechada
      clearInterval(pingInterval);
    }
  }, 25000); // Ping a cada 25 segundos
  
  return socket;
}

/**
 * Envia uma mensagem para o servidor WebSocket
 * @param {WebSocket} socket - Socket WebSocket aberto
 * @param {string} type - Tipo da mensagem
 * @param {any} data - Dados a serem enviados
 * @returns {boolean} - Sucesso do envio
 */
export function sendSocketMessage(socket: WebSocket, type: string, data: any): boolean {
  if (!socket) {
    console.error("Socket não está definido. Mensagem não enviada.");
    return false;
  }
  
  if (socket.readyState === WebSocket.OPEN) {
    try {
      const message = { 
        type, 
        data,
        timestamp: new Date().toISOString() 
      };
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem WebSocket:", error);
      return false;
    }
  } else {
    console.warn(`WebSocket não está aberto (estado: ${socket.readyState}). Mensagem não enviada.`);
    return false;
  }
}

/**
 * Adiciona um listener tipado para mensagens de um tipo específico
 * @param {WebSocket} socket - Socket WebSocket
 * @param {string} messageType - Tipo da mensagem para filtrar
 * @param {Function} callback - Função a ser chamada quando mensagens deste tipo forem recebidas
 * @returns {Function} - Função para remover o listener
 */
export function addSocketListener(
  socket: WebSocket,
  messageType: string,
  callback: (data: any) => void
): () => void {
  if (!socket) {
    console.error("Socket não está definido. Listener não adicionado.");
    return () => {}; // Função de limpeza vazia
  }
  
  const handler = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === messageType) {
        // Adicionar informações de debug nos ambientes de desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[WS Recebido] ${messageType}:`, message.data);
        }
        callback(message.data);
      }
    } catch (error) {
      console.error("Erro ao processar mensagem WebSocket:", error);
    }
  };
  
  socket.addEventListener("message", handler);
  
  // Retornar função para remover o listener
  return () => {
    if (socket) {
      socket.removeEventListener("message", handler);
    }
  };
}
