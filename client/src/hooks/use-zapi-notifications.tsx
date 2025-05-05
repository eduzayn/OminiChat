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
    console.log('Processando notificação Z-API:', data);
    
    let messageContent = data.message?.content || '';
    let messageTitle = 'Nova mensagem WhatsApp';
    let isMedia = false;
    let conversationId = data.message?.conversationId;
    let hasAttachment = false;
    let mediaType = '';
    let mediaUrl = '';
    let fileName = '';
    
    // Verificar se a mensagem tem anexos
    if (data.message?.attachments && data.message.attachments.length > 0) {
      hasAttachment = true;
      const attachment = data.message.attachments[0];
      mediaType = attachment.type || '';
      mediaUrl = attachment.url || '';
      fileName = attachment.fileName || '';
      console.log('Anexo detectado:', { mediaType, mediaUrl, fileName });
    }
    
    // Verificar se a mensagem tem metadados e se é uma mídia
    if (data.message?.metadata) {
      isMedia = !!data.message.metadata.isMedia;
      
      // Se não temos tipo de mídia dos anexos, usar dos metadados
      if (!mediaType && data.message.metadata.mediaType) {
        mediaType = data.message.metadata.mediaType;
      }
      
      // Se não temos URL da mídia dos anexos, usar dos metadados
      if (!mediaUrl && data.message.metadata.mediaUrl) {
        mediaUrl = data.message.metadata.mediaUrl;
      }
      
      console.log('Metadados detectados:', { 
        isMedia, 
        mediaType: data.message.metadata.mediaType,
        mediaUrl: data.message.metadata.mediaUrl
      });
    }
    
    // Definir conteúdo com base no tipo de mídia (de anexos ou metadados)
    if (isMedia || hasAttachment) {
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
          messageContent = fileName 
            ? `📄 Documento: ${fileName}`
            : '📄 Documento';
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
        case 'sticker':
          messageContent = '🏷️ Sticker';
          messageTitle = 'Novo sticker recebido';
          break;
        default:
          messageContent = '📱 Mídia';
          messageTitle = 'Nova mídia recebida';
      }
      
      // Adicionar legenda ao conteúdo, se existir
      if (data.message.content && data.message.content.trim() !== '' 
          && data.message.content !== messageContent) {
        messageContent += `: ${data.message.content}`;
      }
    }
    
    console.log('Conteúdo processado:', { messageTitle, messageContent });
    
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
    
    // Reproduzir som de notificação adequado ao tipo de mensagem
    try {
      // Selecionar som com base no tipo de mensagem
      let soundFile = '/sounds/notification.mp3';
      
      // Para diferentes tipos de mídia, podemos usar sons diferentes
      if (isMedia || hasAttachment) {
        switch (mediaType) {
          case 'image':
          case 'video':
            soundFile = '/sounds/media-notification.mp3';
            break;
          case 'audio':
          case 'ptt':
            soundFile = '/sounds/voice-notification.mp3';
            break;
          default:
            soundFile = '/sounds/notification.mp3';
        }
      }
      
      // Tentar reproduzir o som, mas não falhar se o arquivo não existir
      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      
      audio.play().catch(e => {
        console.log('Erro ao reproduzir som específico, tentando som padrão:', e);
        // Tentar som padrão como fallback
        if (soundFile !== '/sounds/notification.mp3') {
          const fallbackAudio = new Audio('/sounds/notification.mp3');
          fallbackAudio.volume = 0.5;
          fallbackAudio.play().catch(e => console.log('Erro ao reproduzir som padrão:', e));
        }
      });
    } catch (error) {
      console.error('Erro ao reproduzir som de notificação:', error);
    }
    
    // Mostrar notificação do navegador se permitido
    try {
      if (Notification.permission === 'granted') {
        // Selecionar ícone com base no tipo de mensagem
        let icon = '/icons/message-icon.png';
        if (isMedia || hasAttachment) {
          switch (mediaType) {
            case 'image': icon = '/icons/image-icon.png'; break;
            case 'video': icon = '/icons/video-icon.png'; break;
            case 'audio': 
            case 'ptt': icon = '/icons/audio-icon.png'; break;
            case 'document': icon = '/icons/document-icon.png'; break;
            case 'location': icon = '/icons/location-icon.png'; break;
            default: icon = '/icons/message-icon.png';
          }
        }
        
        // Tentar criar a notificação (usando ícones genéricos se os personalizados não existirem)
        const notification = new Notification(messageTitle, {
          body: `${data.contact?.name || 'Contato'}: ${messageContent}`,
          icon: icon,
          badge: '/favicon.ico'
        });
        
        // Ao clicar na notificação, navegar para a conversa
        if (conversationId) {
          notification.onclick = () => {
            window.focus();
            navigateToConversation(conversationId);
          };
        }
        
        // Fechar a notificação após alguns segundos
        setTimeout(() => notification.close(), 8000);
      }
      else if (Notification.permission !== 'denied') {
        // Se não temos permissão mas também não foi negada, pedir permissão para futuras notificações
        Notification.requestPermission();
      }
    } catch (error) {
      console.error('Erro ao exibir notificação do navegador:', error);
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

  // Solicitar permissão para notificações ao inicializar o componente
  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window) {
      // Se já temos permissão, não fazemos nada
      if (Notification.permission === 'granted') {
        console.log('Permissão para notificações já concedida');
      } 
      // Se a permissão não foi negada, solicitar permissão
      else if (Notification.permission !== 'denied') {
        console.log('Solicitando permissão para notificações...');
        
        Notification.requestPermission()
          .then(permission => {
            if (permission === 'granted') {
              toast({
                title: 'Notificações ativadas',
                description: 'Você receberá notificações de novas mensagens',
                duration: 3000
              });
            }
          })
          .catch(error => {
            console.error('Erro ao solicitar permissão de notificação:', error);
          });
      }
    }
  }, [toast]);

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