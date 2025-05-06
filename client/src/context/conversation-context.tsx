import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { socketService } from '@/lib/socket';
import { Conversation, Message } from '@shared/schema';

interface ConversationContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  conversationMessages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  selectConversation: (conversationId: number) => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (conversationId: number) => Promise<void>;
  assignToMe: (conversationId: number) => Promise<void>;
  refreshConversations: () => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  // Buscar todas as conversas
  const { 
    data: conversations = [], 
    isLoading: isLoadingConversations,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/conversations');
      return response as Conversation[];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar mensagens da conversa selecionada
  const { 
    data: conversationMessages = [], 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ['/api/conversations', selectedConversationId, 'messages'],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const response = await apiRequest('GET', `/api/conversations/${selectedConversationId}/messages`);
      return response as Message[];
    },
    enabled: !!selectedConversationId,
    refetchInterval: 5000, // Atualizar a cada 5 segundos quando uma conversa está selecionada
  });

  // Encontrar a conversa selecionada a partir do ID
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Configurar eventos do socket para notificações em tempo real
  useEffect(() => {
    const handleNewMessage = (data: { conversationId: number }) => {
      // Invalidar consultas para atualizar as conversas e as mensagens
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      if (selectedConversationId === data.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations', selectedConversationId, 'messages'] 
        });
      }
    };

    const handleConversationUpdate = () => {
      // Invalidar consultas para atualizar as conversas
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    };

    // Inscrever-se nos eventos
    socketService.on('new_message', handleNewMessage);
    socketService.on('conversation_updated', handleConversationUpdate);
    socketService.on('conversation_assigned', handleConversationUpdate);

    // Limpar inscrições ao desmontar
    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('conversation_updated', handleConversationUpdate);
      socketService.off('conversation_assigned', handleConversationUpdate);
    };
  }, [queryClient, selectedConversationId]);

  // Selecionar uma conversa
  const selectConversation = async (conversationId: number) => {
    setSelectedConversationId(conversationId);
    
    // Marcar como lida automaticamente ao selecionar
    try {
      await apiRequest('POST', `/api/conversations/${conversationId}/read`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error) {
      console.error('Erro ao marcar conversa como lida:', error);
    }
  };

  // Enviar mensagem
  const sendMessage = async (content: string) => {
    if (!selectedConversationId || !content.trim()) return;

    try {
      await apiRequest('POST', `/api/conversations/${selectedConversationId}/messages`, {
        content: content.trim(),
      });
      
      // Invalidar consultas para atualizar as mensagens
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', selectedConversationId, 'messages'] 
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  };

  // Marcar conversa como lida
  const markAsRead = async (conversationId: number) => {
    try {
      await apiRequest('POST', `/api/conversations/${conversationId}/read`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error) {
      console.error('Erro ao marcar conversa como lida:', error);
      throw error;
    }
  };

  // Atribuir conversa a mim
  const assignToMe = async (conversationId: number) => {
    try {
      await apiRequest('POST', `/api/conversations/${conversationId}/assign`, {});
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    } catch (error) {
      console.error('Erro ao atribuir conversa:', error);
      throw error;
    }
  };

  // Atualizar conversas manualmente
  const refreshConversations = () => {
    refetchConversations();
  };

  const value: ConversationContextType = {
    conversations,
    selectedConversation,
    conversationMessages,
    isLoadingConversations,
    isLoadingMessages,
    selectConversation,
    sendMessage,
    markAsRead,
    assignToMe,
    refreshConversations
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};