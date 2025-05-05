import { useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook para lidar com notificações da Z-API via WebSocket
 * Responsável por exibir toast e atualizar dados quando mensagens são recebidas
 */
export function useZAPINotifications() {
  const { addListener } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Registrar listener para notificações Z-API
    const unsubscribe = addListener('zapi_notification', (data) => {
      console.log('Notificação Z-API recebida:', data);
      
      // Exibir toast com detalhes da mensagem
      toast({
        title: 'Nova mensagem Z-API',
        description: `Mensagem de ${data.contact?.name || data.contact?.phone || 'Contato'}: ${data.message?.content || '(mídia)'}`,
        duration: 5000,
        variant: 'default'
      });
      
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
  }, [addListener, toast, queryClient]);
  
  return null; // Este hook é apenas para efeitos, não retorna nenhum valor
}