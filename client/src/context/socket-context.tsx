import { createContext, useContext, useEffect, ReactNode, useState, useCallback, useRef } from "react";
import { useAuth } from "./auth-context";
import { addSocketListener, sendSocketMessage } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";

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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    
    if (!host) {
      console.error("Não foi possível estabelecer conexão WebSocket: host indefinido");
      return;
    }
    
    // URL do WebSocket
    const wsUrl = `${protocol}//${host}/ws`;
    console.log("Conectando ao WebSocket em:", wsUrl);
    
    // Limpar timeout anterior se existir
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    try {
      const ws = new WebSocket(wsUrl);
      
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
      };

      ws.onclose = (event) => {
        console.log(`Conexão WebSocket fechada: ${event.code} ${event.reason}`);
        setConnected(false);
        setSocket(null);
        
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
      
      // Listener para welcome message do servidor
      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "welcome") {
            console.log("Servidor WebSocket:", data.message);
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
