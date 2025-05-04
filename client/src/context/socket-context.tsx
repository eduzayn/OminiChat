import { createContext, useContext, useEffect, ReactNode, useState } from "react";
import { useAuth } from "./auth-context";

interface SocketContextType {
  socket: WebSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      if (!user) {
        return;
      }

      // Usar a URL atual do navegador para conectar ao WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host || window.location.hostname;
      
      if (!host) {
        console.error("Cannot establish WebSocket connection: host is undefined");
        return;
      }
      
      const wsUrl = `${protocol}//${host}/ws`;
      console.log("Connecting to WebSocket at:", wsUrl);
      
      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        return;
      }

      ws.onopen = () => {
        console.log("WebSocket connection established");
        setConnected(true);
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: "authenticate",
          data: {
            userId: user.id,
            role: user.role
          }
        }));
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setConnected(false);
        
        // Reconnect after a delay
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws?.close();
      };

      setSocket(ws);
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
