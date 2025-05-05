import { useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

/**
 * Hook para lidar com notificações da Z-API via WebSocket
 * Responsável por exibir toast e atualizar dados quando mensagens são recebidas
 */
export function useZAPINotifications() {
  const { addListener } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    console.log('Registrando listener para notificações Z-API');
    
    // Registrar listener para notificações Z-API
    const unsubscribe = addListener('zapi_notification', (data) => {
      console.log('Notificação Z-API recebida:', data);
      
      // Determinar o conteúdo da mensagem com base no tipo
      let messageContent = data.message?.content || '';
      let messageTitle = 'Nova mensagem WhatsApp';
      let isMedia = false;
      
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
      
      // Exibir toast com detalhes da mensagem
      toast({
        title: messageTitle,
        description: `${contactName}: ${messageContent}`,
        duration: 6000,
        variant: 'default'
        // Não utilizamos action aqui por questões de compatibilidade com o tipo ToastActionElement
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
      if (data.message?.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['messages', data.message.conversationId] 
        });
      }
    });
    
    // Limpar listener ao desmontar
    return () => {
      unsubscribe();
    };
  }, [addListener, toast, queryClient, navigate]);
  
  return null; // Este hook é apenas para efeitos, não retorna nenhum valor
}