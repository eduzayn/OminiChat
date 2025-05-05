import { createContext, useContext, useEffect, ReactNode, useState, useCallback, useRef } from "react";
import { useAuth } from "./auth-context";
import { useToast } from "@/hooks/use-toast";

// Funções para interagir com WebSocket
function sendSocketMessage(socket: WebSocket, type: string, data: any): boolean {
  if (socket.readyState !== WebSocket.OPEN) {
    console.warn(`WebSocket não está pronto para enviar mensagens (estado: ${socket.readyState})`);
    return false;
  }
  
  try {
    socket.send(JSON.stringify({ 
      type, 
      data,
      timestamp: new Date().toISOString() 
    }));
    return true;
  } catch (error) {
    console.error("Erro ao enviar mensagem WebSocket:", error);
    return false;
  }
}

function addSocketListener(
  socket: WebSocket,
  messageType: string,
  callback: (data: any) => void
): () => void {
  const handler = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === messageType) {
        callback(message.data);
      }
    } catch (error) {
      console.error("Erro ao processar mensagem WebSocket:", error);
    }
  };
  
  socket.addEventListener("message", handler);
  
  // Retornar função para remover o listener
  return () => {
    socket.removeEventListener("message", handler);
  };
}

interface SocketContextType {
  socket: WebSocket | null;
  connected: boolean;
  sendMessage: (type: string, data: any) => void;
  addListener: (messageType: string, callback: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Função para enviar mensagens via WebSocket
  const sendMessage = useCallback((type: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendSocketMessage(socket, type, data);
    } else {
      console.warn("Tentativa de enviar mensagem com WebSocket desconectado");
    }
  }, [socket]);

  // Função para adicionar listeners de eventos
  const addListener = useCallback((messageType: string, callback: (data: any) => void) => {
    if (!socket) return () => {};
    return addSocketListener(socket, messageType, callback);
  }, [socket]);

  // Função para conectar ao WebSocket
  const connectWebSocket = useCallback(() => {
    if (!user) return;

    // Limpar timeout anterior se existir
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
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
      
      // Criar o WebSocket com validação
      const ws = new WebSocket(wsUrl);
      
      // Referência para o timer de ping/pong
      let pingIntervalRef: NodeJS.Timeout | null = null;
      let pongTimeoutRef: NodeJS.Timeout | null = null;
      
      // Função para limpar os timers
      const clearTimers = () => {
        if (pingIntervalRef) {
          clearInterval(pingIntervalRef);
          pingIntervalRef = null;
        }
        if (pongTimeoutRef) {
          clearTimeout(pongTimeoutRef);
          pongTimeoutRef = null;
        }
      };
      
      ws.onopen = () => {
        console.log("Conexão WebSocket estabelecida");
        setConnected(true);
        
        // Enviar mensagem de autenticação
        ws.send(JSON.stringify({
          type: "authenticate",
          data: {
            userId: user.id,
            role: user.role
          }
        }));
        
        // Configurar ping/pong para manter a conexão ativa
        pingIntervalRef = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('Enviando ping para servidor...');
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
            
            // Se não receber um pong em 10 segundos, considera a conexão morta
            pongTimeoutRef = setTimeout(() => {
              console.warn('Pong não recebido a tempo, verificando conexão...');
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(4000, 'Pong não recebido');
              }
            }, 10000);
          }
        }, 30000); // Ping a cada 30 segundos
      };

      ws.onclose = (event) => {
        console.log(`Conexão WebSocket fechada: ${event.code} ${event.reason}`);
        setConnected(false);
        setSocket(null);
        
        // Limpar timers de ping/pong
        clearTimers();
        
        // Tentar reconectar após um intervalo crescente (3-15 segundos)
        const reconnectDelay = Math.min(3000 + Math.random() * 7000, 15000);
        console.log(`Tentando reconectar em ${Math.round(reconnectDelay/1000)}s`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, reconnectDelay);
      };

      ws.onerror = (error) => {
        console.error("Erro de WebSocket:", error);
        // O evento onclose será disparado automaticamente após um erro
      };
      
      // Listener para welcome message do servidor, pongs e outros eventos de sistema
      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "welcome") {
            console.log("Servidor WebSocket:", data.message);
          }
          else if (data.type === "ping") {
            console.log('Ping recebido do servidor:', data);
            
            // Responder imediatamente com um pong
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: Date.now(),
                originalTimestamp: data.timestamp
              }));
            }
          }
          else if (data.type === "pong") {
            console.log('Pong recebido do servidor:', data);
            
            // Calcular latência com o timestamp original (se disponível)
            if (data.originalTimestamp) {
              const latency = Date.now() - data.originalTimestamp;
              console.log(`Latência WebSocket: ${latency}ms`);
            }
            
            // Limpar o timeout do pong, pois recebemos resposta
            if (pongTimeoutRef) {
              clearTimeout(pongTimeoutRef);
              pongTimeoutRef = null;
            }
          }
          else if (data.type === "authentication_success") {
            console.log('Autenticação WebSocket bem-sucedida', data);
            toast({
              title: "Conexão estabelecida",
              description: "Você está conectado e receberá notificações em tempo real",
              duration: 3000
            });
          }
          else if (data.type === "authentication_error") {
            console.error('Erro de autenticação WebSocket:', data);
            toast({
              title: "Erro de conexão",
              description: "Houve um problema com a conexão em tempo real",
              variant: "destructive",
              duration: 5000
            });
          }
          else if (data.type === "connection_stats") {
            // Atualizar estatísticas de conexão (clientes ativos, etc)
            console.log('Estatísticas de conexão:', data);
          }
        } catch (e) {
          console.error("Erro ao processar mensagem do servidor:", e);
        }
      });

      setSocket(ws);
    } catch (error) {
      console.error("Falha ao criar conexão WebSocket:", error);
      // Tentar novamente em caso de erro na criação
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  }, [user]);

  // Iniciar conexão WebSocket quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      connectWebSocket();
    }
    
    // Cleanup ao desmontar
    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, connectWebSocket]);
  
  // Notificar mudanças no estado da conexão
  useEffect(() => {
    if (connected) {
      toast({
        title: "Conexão estabelecida",
        description: "Você está conectado ao sistema de comunicação em tempo real",
        duration: 3000
      });
    }
  }, [connected, toast]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      connected, 
      sendMessage,
      addListener
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket deve ser usado dentro de um SocketProvider");
  }
  return context;
}
