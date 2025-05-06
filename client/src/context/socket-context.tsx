import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { socketService } from '@/lib/socket';

// Interface para o contexto
interface SocketContextType {
  isConnected: boolean;
  lastMessage: any | null;
  sendMessage: (type: string, data: any) => boolean;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
}

// Criar o contexto
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Provider
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const { user } = useAuth();

  // Verificar estado da conexão e autenticar quando estiver pronta
  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
      
      // Se conectado e temos um usuário, enviar informações de autenticação
      if (connected && user && user.id) {
        socketService.send('authenticate', {
          userId: user.id,
          userRole: user.role || 'user'
        });
      }
    };
    
    // Verificar quando o socket é inicializado
    const initInterval = setInterval(() => {
      checkConnection();
      // Parar de verificar quando conectado
      if (isConnected) {
        clearInterval(initInterval);
      }
    }, 1000);
    
    // Configurar listeners para eventos de conexão
    const handleOpen = () => {
      setIsConnected(true);
      if (user && user.id) {
        socketService.send('authenticate', {
          userId: user.id,
          userRole: user.role || 'user'
        });
      }
    };
    
    const handleClose = () => {
      setIsConnected(false);
    };
    
    const handleAuthentication = (data: any) => {
      console.log("Autenticação WebSocket bem-sucedida", data);
      console.log("WebSocket conectado. Pronto para receber notificações em tempo real");
    };
    
    const handleMessage = (data: any) => {
      setLastMessage(data);
    };
    
    // Registrar handlers
    socketService.on('open', handleOpen);
    socketService.on('close', handleClose);
    socketService.on('authentication_success', handleAuthentication);
    socketService.on('message', handleMessage);
    
    // Limpar listeners
    return () => {
      clearInterval(initInterval);
      socketService.off('open', handleOpen);
      socketService.off('close', handleClose);
      socketService.off('authentication_success', handleAuthentication);
      socketService.off('message', handleMessage);
    };
  }, [user, isConnected]);
  
  // Função para enviar mensagens
  const sendMessage = (type: string, data: any): boolean => {
    return socketService.send(type, data);
  };
  
  // Função para se inscrever em eventos
  const subscribe = (event: string, callback: (data: any) => void): (() => void) => {
    socketService.on(event, callback);
    return () => socketService.off(event, callback);
  };
  
  const value: SocketContextType = {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook para usar o contexto
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};