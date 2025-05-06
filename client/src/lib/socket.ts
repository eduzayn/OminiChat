// Definir tipo para o manipulador de eventos
type EventHandler = (data: any) => void;

// Interface para o serviço de socket
interface SocketService {
  socket: WebSocket | null;
  listeners: Map<string, Set<EventHandler>>;
  initialize: () => void;
  send: (type: string, data: any) => boolean;
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
  isConnected: () => boolean;
  notifyListeners: (event: string, data: any) => void;
}

/**
 * Cria uma conexão WebSocket com o servidor, com opções avançadas de tratamento de eventos
 * @returns {WebSocket} A instância de WebSocket criada
 */
function createWebSocket(): WebSocket {
  try {
    // Determinar o protocolo baseado no protocolo atual da página
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // Garantir que temos um host válido
    const host = window.location.host;
    if (!host || host.includes('undefined')) {
      throw new Error("Host inválido ou indefinido detectado");
    }
    
    // Construir URL WebSocket com caminho específico
    const wsUrl = `${protocol}//${host}/ws`;
    console.log("Conectando ao WebSocket em:", wsUrl);
    
    // Criar o socket com validação
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
        console.log(`Conexão WebSocket fechada: ${event.code} ${event.reason}`);
      } else {
        console.log("Conexão WebSocket fechada normalmente");
      }
      
      // Desativar o ping/pong
      (socket as any).pingPongActive = false;
      
      // Tentar reconectar após um tempo
      if (event.code !== 1000) {
        const reconnectTime = 8; // segundos
        console.log(`Tentando reconectar em ${reconnectTime}s`);
        setTimeout(() => {
          socketService.initialize();
        }, reconnectTime * 1000);
      }
    };
    
    socket.onerror = (error) => {
      console.error("Erro na conexão WebSocket:", error);
    };
    
    // Adicionar suporte a ping/pong para detecção de conexão perdida
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data.type);
        
        // Resetar contador de pings perdidos quando qualquer mensagem válida é recebida
        if (data && typeof data === 'object') {
          (socket as any).missedPings = 0;
          
          // Se for uma mensagem de ping, responder com um pong
          if (data.type === 'ping') {
            console.log("Ping recebido do servidor:", data);
            console.log("Enviando ping para servidor...");
            socket.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: Date.now(),
              clientTime: new Date().toISOString() 
            }));
          }
          
          // Se for uma mensagem de pong, atualizamos o status da conexão
          if (data.type === 'pong') {
            console.log("Pong recebido do servidor:", data);
          }
          
          // Notificar handlers registrados
          if (data.type) {
            socketService.notifyListeners(data.type, data.data || data);
          }
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
          console.log("Enviando ping para servidor...");
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
    }, 30000); // Ping a cada 30 segundos
    
    return socket;
  } catch (error) {
    console.error("Erro ao criar WebSocket:", error);
    throw error; // Re-lançar o erro para ser tratado pelo chamador
  }
}

// Criar o serviço de socket singleton
export const socketService: SocketService = {
  socket: null,
  listeners: new Map<string, Set<EventHandler>>(),
  
  initialize() {
    try {
      this.socket = createWebSocket();
      
      // Configurar handler de mensagens global para distribuir eventos
      this.socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message && message.type) {
            this.notifyListeners(message.type, message.data || message);
          }
        } catch (e) {
          // Ignorar mensagens que não são JSON válido
        }
      });
      
    } catch (error) {
      console.error("Falha ao inicializar o serviço de socket:", error);
    }
  },
  
  send(type: string, data: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Socket não está conectado. Mensagem não enviada.");
      return false;
    }
    
    try {
      const message = {
        type,
        data,
        timestamp: Date.now()
      };
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      return false;
    }
  },
  
  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);
  },
  
  off(event: string, handler: EventHandler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.delete(handler);
    }
  },
  
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  },
  
  // Método interno para notificar todos os handlers registrados para um tipo de evento
  notifyListeners(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Erro ao executar handler para evento ${event}:`, error);
        }
      });
    }
  }
};

// Inicializar socket automaticamente
if (typeof window !== 'undefined') {
  // Verificar se já existe uma conexão
  if (!socketService.socket) {
    // Inicializar apenas no cliente
    socketService.initialize();
  }
}
