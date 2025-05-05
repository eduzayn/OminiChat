import { useEffect, useCallback } from 'react';
import { useSocket } from '@/context/socket-context';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ToastAction } from '@/components/ui/toast';

/**
 * Hook para lidar com notificações da Z-API via WebSocket
 * Responsável por exibir toast e atualizar dados quando mensagens são recebidas
 */
export function useZAPINotifications() {
  const { addListener, connected } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Função para navegar para a conversa quando usuário clicar na notificação
  const navigateToConversation = useCallback((conversationId: number) => {
    if (conversationId) {
      navigate(`/conversations/${conversationId}`);
    }
  }, [navigate]);

  // Processar notificação Z-API
  const handleZAPINotification = useCallback((data: any) => {
    console.log('Notificação Z-API recebida:', data);
    
    // Determinar o conteúdo da mensagem com base no tipo
    let messageContent = data.message?.content || '';
    let messageTitle = 'Nova mensagem WhatsApp';
    let isMedia = false;
    let conversationId = data.message?.conversationId;
    
    // Verificar se a mensagem tem metadados e se é uma mídia
    if (data.message?.metadata) {
      isMedia = !!data.message.metadata.isMedia;
      
      // Ajustar conteúdo com base no tipo de mídia
      if (isMedia) {
        const mediaType = data.message.metadata.mediaType;
        switch (mediaType) {
          case 'image':
            messageContent = '📷 Imagem';
            messageTitle = 'Nova imagem recebida';
            break;
          case 'video':
            messageContent = '🎥 Vídeo';
            messageTitle = 'Novo vídeo recebido';
            break;
          case 'audio':
          case 'ptt':
            messageContent = '🔊 Áudio';
            messageTitle = 'Novo áudio recebido';
            break;
          case 'document':
            messageContent = '📄 Documento';
            messageTitle = 'Novo documento recebido';
            break;
          case 'location':
            messageContent = '📍 Localização';
            messageTitle = 'Localização compartilhada';
            break;
          case 'contact':
            messageContent = '👤 Contato';
            messageTitle = 'Contato compartilhado';
            break;
          default:
            messageContent = '📱 Mídia';
            messageTitle = 'Nova mídia recebida';
        }
        
        // Adicionar legenda ao conteúdo, se existir
        if (data.message.content && data.message.content.trim() !== '') {
          messageContent += `: ${data.message.content}`;
        }
      }
    }
    
    // Nome ou telefone do contato
    const contactName = data.contact?.name || data.contact?.phone || 'Contato';
    
    // Exibir toast com detalhes da mensagem e ação para visualizar conversa
    toast({
      title: messageTitle,
      description: `${contactName}: ${messageContent}`,
      duration: 8000,
      variant: 'default',
      action: conversationId ? (
        <ToastAction 
          altText="Ver mensagem" 
          onClick={() => navigateToConversation(conversationId)}
        >
          Ver mensagem
        </ToastAction>
      ) : undefined
    });
    
    // Reproduzir som de notificação
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Erro ao reproduzir som:', e));
    } catch (error) {
      console.error('Erro ao reproduzir som de notificação:', error);
    }
    
    // Invalidar cache para forçar atualização dos dados
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    
    // Se a mensagem for de um canal específico, invalidar suas mensagens também
    if (conversationId) {
      queryClient.invalidateQueries({ 
        queryKey: ['messages', conversationId] 
      });
    }
  }, [toast, queryClient, navigateToConversation]);

  // Registrar o listener de notificações quando o WebSocket estiver conectado
  useEffect(() => {
    if (!connected) {
      console.log('WebSocket não conectado. Aguardando conexão para registrar listener...');
      return () => {};
    }
    
    console.log('WebSocket conectado. Registrando listener para notificações Z-API');
    
    // Registrar listener para notificações Z-API
    const unsubscribe = addListener('zapi_notification', handleZAPINotification);
    
    // Registrar listener para mensagens novas (como backup, caso venham por outro canal)
    const unsubscribeNewMessage = addListener('new_message', (data) => {
      // Verificar se é mensagem do Z-API pelo metadata
      if (data.metadata?.source === 'zapi') {
        console.log('Mensagem Z-API recebida via canal new_message');
        handleZAPINotification({
          message: data,
          contact: data.contact,
          channel: { type: 'whatsapp', provider: 'zapi' }
        });
      }
    });
    
    // Limpar listeners ao desmontar
    return () => {
      unsubscribe();
      unsubscribeNewMessage();
    };
  }, [connected, addListener, handleZAPINotification]);
  
  return null; // Este hook é apenas para efeitos, não retorna nenhum valor
}