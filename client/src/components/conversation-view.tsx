import { useState, useRef, useEffect } from "react";
import { useConversation } from "@/context/conversation-context";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message, MessageTemplate } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Phone, 
  DollarSign, 
  Info, 
  MoreHorizontal, 
  Paperclip, 
  SmilePlus, 
  Send,
  Ticket,
  Bot,
  MessageSquare,
  Image,
  FileText,
  Music,
  Video
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function ChannelBadge({ type }: { type: string }) {
  let icon = null;
  let label = "";
  let colorClass = "";
  
  switch (type) {
    case "whatsapp":
      icon = <i className="ri-whatsapp-fill mr-1"></i>;
      label = "WhatsApp";
      colorClass = "bg-success-50 text-success-700";
      break;
    case "instagram":
      icon = <i className="ri-instagram-fill mr-1"></i>;
      label = "Instagram";
      colorClass = "bg-secondary-50 text-secondary-700";
      break;
    case "facebook":
      icon = <i className="ri-facebook-fill mr-1"></i>;
      label = "Facebook";
      colorClass = "bg-primary-50 text-primary-700";
      break;
    default:
      icon = <i className="ri-message-2-fill mr-1"></i>;
      label = "Message";
      colorClass = "bg-neutral-50 text-neutral-700";
  }
  
  return (
    <div className={`flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MessageBubble({ message, isAgent }: { message: Message, isAgent: boolean }) {
  const timestamp = new Date(message.createdAt);
  
  // If this is a payment request message
  const paymentRequest = message.metadata?.paymentRequest;
  
  return (
    <div className={`flex items-end ${isAgent ? 'justify-end' : ''}`}>
      {!isAgent && (
        <div className="ml-2 flex-shrink-0 order-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={message.contact?.avatarUrl} />
            <AvatarFallback>{message.contact?.name?.charAt(0) || "C"}</AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className={`max-w-md ${isAgent ? 'mr-2' : 'ml-2'}`}>
        <div className={`p-3 rounded-lg shadow-sm ${
          isAgent 
            ? 'bg-primary-500 text-white chat-bubble-agent' 
            : 'bg-white text-neutral-800 chat-bubble-client'
        }`}>
          <p className="text-sm">{message.content}</p>
        </div>
        
        {paymentRequest && (
          <div className="mt-2 bg-white p-3 rounded-lg border border-primary-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-800">Payment Request</span>
              <span className="text-sm font-bold text-primary-600">
                R${Number(paymentRequest.amount).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-neutral-600 mb-3">{paymentRequest.description}</p>
            <Button 
              className="w-full bg-primary-500 hover:bg-primary-600"
              onClick={() => window.open(paymentRequest.paymentUrl, '_blank')}
            >
              Pay Now
            </Button>
          </div>
        )}
        
        <div className={`flex items-center mt-1 ${isAgent ? 'justify-end' : ''}`}>
          <span className="text-xs text-neutral-500">
            {format(timestamp, 'h:mm a')}
          </span>
          {isAgent && message.status === "read" && (
            <i className="ri-check-double-line text-primary-500 ml-1"></i>
          )}
          {isAgent && message.status === "delivered" && (
            <i className="ri-check-line text-neutral-500 ml-1"></i>
          )}
        </div>
      </div>
      
      {isAgent && (
        <div className="mr-2 flex-shrink-0">
          <Avatar className="w-8 h-8 bg-primary-100 text-primary-700">
            <AvatarFallback>{message.agent?.name?.charAt(0) || "A"}</AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  let label = "";
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    label = "Hoje";
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = "Ontem";
  } else {
    label = format(date, "d 'de' MMMM, yyyy", { locale: ptBR });
  }
  
  return (
    <div className="flex justify-center">
      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

// Componente para atribuição de atendentes
function AssignToAgentDropdown({ 
  conversationId, 
  currentAgentId 
}: { 
  conversationId: number;
  currentAgentId: number | null;
}) {
  const { toast } = useToast();
  
  // Buscar os agentes disponíveis
  const agentsQuery = useQuery({
    queryKey: ['/api/users/agents'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/users/agents');
      return response.json();
    }
  });
  
  // Mutation para atribuir a conversa
  const assignConversationMutation = useMutation({
    mutationFn: async (agentId: number | null) => {
      return await apiRequest("PATCH", `/api/conversations/${conversationId}/assign`, {
        agentId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        description: "Conversa atribuída com sucesso",
        duration: 3000
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Erro ao atribuir conversa",
        duration: 5000
      });
    }
  });
  
  // Função para atribuir automaticamente
  const assignAutomatically = async () => {
    try {
      // Aqui seria uma lógica mais complexa no mundo real,
      // como balanceamento de carga, capacidade do agente, etc.
      // Por simplicidade, vamos escolher o primeiro agente da lista
      // ou um aleatório se houver mais de um
      
      const agents = agentsQuery.data || [];
      
      if (agents.length === 0) {
        toast({
          variant: "destructive",
          description: "Não há agentes disponíveis para atribuição automática",
          duration: 5000
        });
        return;
      }
      
      // Escolha aleatória de um agente
      const randomIndex = Math.floor(Math.random() * agents.length);
      const randomAgent = agents[randomIndex];
      
      assignConversationMutation.mutate(randomAgent.id);
      
    } catch (error) {
      console.error("Erro na atribuição automática:", error);
      toast({
        variant: "destructive",
        description: "Erro ao realizar atribuição automática",
        duration: 5000
      });
    }
  };
  
  return (
    <>
      <DropdownMenuItem 
        className="cursor-pointer"
        onClick={() => assignAutomatically()}
      >
        🤖 Atribuir automaticamente
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      <DropdownMenuLabel>Atribuir para:</DropdownMenuLabel>
      
      {agentsQuery.isLoading ? (
        <DropdownMenuItem disabled>
          Carregando agentes...
        </DropdownMenuItem>
      ) : agentsQuery.data?.length === 0 ? (
        <DropdownMenuItem disabled>
          Nenhum agente disponível
        </DropdownMenuItem>
      ) : (
        <>
          {/* Opção para remover atribuição */}
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => assignConversationMutation.mutate(null)}
          >
            ❌ Remover atribuição
          </DropdownMenuItem>
          
          {/* Lista de agentes */}
          {agentsQuery.data?.map((agent: any) => (
            <DropdownMenuItem 
              key={agent.id}
              className="cursor-pointer"
              onClick={() => assignConversationMutation.mutate(agent.id)}
            >
              {currentAgentId === agent.id ? "✅ " : ""}
              {agent.name}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </>
  );
}

function ConversationView() {
  const { activeConversation } = useConversation();
  const { user } = useAuth();
  const socketContext = useSocket();
  const { socket, connected, sendMessage: sendSocketMessage, addListener } = socketContext;
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Fetch message templates
  const messageTemplatesQuery = useQuery({
    queryKey: ['/api/message-templates'],
    queryFn: async () => {
      const data = await apiRequest("GET", '/api/message-templates');
      return data as MessageTemplate[];
    }
  });
  
  const messageTemplates = messageTemplatesQuery.data || [];
  
  // Fetch messages for the active conversation
  useEffect(() => {
    if (activeConversation) {
      setIsLoading(true);
      
      apiRequest("GET", `/api/conversations/${activeConversation.id}/messages`)
        .then(data => {
          console.log("Mensagens carregadas:", data);
          setMessages(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching messages:", err);
          setIsLoading(false);
        });
    } else {
      setMessages([]);
    }
  }, [activeConversation]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Listen for new messages from the socket
  useEffect(() => {
    if (!socket || !activeConversation) return;
    
    // Criação de handlers para diferentes tipos de eventos
    const handleNewMessage = (data: any) => {
      console.log("ConversationView - Dados de nova mensagem recebidos:", data);
      
      // Verificar se os dados são válidos
      if (!data) {
        console.error("Dados de mensagem inválidos recebidos do socket:", data);
        return;
      }
      
      // Usar o próprio objeto data como mensagem, já que o socket-context já faz o processamento
      const message = data;
      
      // Log adicional para debug
      console.log("Estado atual da conversa:", { 
        activeConversationId: activeConversation?.id,
        messageConversationId: message?.conversationId,
        messageId: message?.id,
        messageContent: message?.content?.substring(0, 30)
      });
      
      // Verificar se a mensagem tem os campos necessários
      if (!message || !message.conversationId) {
        console.error("Mensagem recebida do socket está em formato inválido:", message);
        return;
      }
      
      // Processar a mensagem se pertence à conversa ativa
      if (Number(message.conversationId) === Number(activeConversation.id)) {
        console.log("Mensagem corresponde à conversa ativa. Adicionando à lista...");
        // Verificar se a mensagem já existe para evitar duplicação
        setMessages(prev => {
          // Se a mensagem já existe na lista, não adicione novamente
          const messageExists = prev.some(m => Number(m.id) === Number(message.id));
          if (messageExists) {
            console.log("Mensagem já existe na lista, ignorando duplicata.");
            return prev;
          }
          console.log("Adicionando nova mensagem à lista:", message);
          return [...prev, message];
        });
        
        // Marcar como lida se for uma mensagem do cliente
        if (!message.isFromAgent) {
          apiRequest("PATCH", `/api/conversations/${activeConversation.id}/messages/${message.id}/read`, {})
            .catch(err => console.error("Erro ao marcar mensagem como lida:", err));
        }
        
        // Rolagem para o final da conversa
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };
    
    const handleTypingStatus = (data: any) => {
      // Verificar se é para a conversa atual e não é do agente
      if (data.conversationId === activeConversation.id && !data.isAgent) {
        setIsTyping(data.isTyping);
        
        // Auto-reset do status de digitação após um tempo
        if (data.isTyping) {
          setTimeout(() => {
            setIsTyping(false);
          }, 10000); // Resetar após 10 segundos se não receber outra atualização
        }
      }
    };
    
    // Usar a nova API de addListener do socket-context
    const removeNewMessageListener = addListener("new_message", handleNewMessage);
    const removeTypingListener = addListener("typing_status", handleTypingStatus);
    
    // Iniciar com status não está digitando
    setIsTyping(false);
    
    // Enviar sinal de que a conversa está aberta
    sendSocketMessage("conversation_opened", {
      conversationId: activeConversation.id,
      agentId: user?.id
    });
    
    // Limpar listeners ao desmontar ou mudar de conversa
    return () => {
      removeNewMessageListener();
      removeTypingListener();
      
      // Informar que o agente fechou a conversa
      if (socket && connected) {
        sendSocketMessage("conversation_closed", {
          conversationId: activeConversation.id,
          agentId: user?.id
        });
      }
    };
  }, [socket, activeConversation, connected, user, addListener, sendSocketMessage]);
  
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;
    
    // Salvar o texto da mensagem antes de limpar o campo
    const currentMessage = messageInput;
    
    // Otimizar a experiência do usuário limpando o campo imediatamente
    setMessageInput("");
    
    // Adicionar mensagem temporária com um ID temporário
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId as any,
      conversationId: activeConversation.id,
      content: currentMessage,
      isFromAgent: true,
      agentId: user?.id,
      status: "sending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agent: user ? {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl
      } : undefined
    };
    
    // Adicionar a mensagem temporária à lista
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      // Enviar a mensagem para o servidor
      // apiRequest já faz o .json() e retorna os dados diretamente
      const newMessage = await apiRequest("POST", `/api/conversations/${activeConversation.id}/messages`, {
        content: currentMessage,
        isFromAgent: true,
        agentId: user?.id
      });
      
      // Atualizar as mensagens - remover a temporária e adicionar a real
      setMessages(prev => {
        // Filtrar a mensagem temporária e verificar duplicação
        const filteredMessages = prev.filter(m => m.id !== tempId);
        // Verifica se a mensagem já existe usando o ID como número
        const messageExists = filteredMessages.some(m => Number(m.id) === Number(newMessage.id));
        
        if (messageExists) {
          return filteredMessages;
        }
        return [...filteredMessages, newMessage];
      });
      
      // Atualizar a lista de conversas para mostrar a última mensagem
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Mostrar erro na UI
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar sua mensagem. Tente novamente."
      });
      
      // Remover a mensagem temporária
      setMessages(prev => prev.filter(m => m.id !== tempId));
      
      // Se o usuário tinha começado a digitar uma nova mensagem, recoloque-a no campo
      if (messageInput.trim() === "") {
        setMessageInput(currentMessage);
      }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Enviar status de digitação através do socket usando a nova API
    if (socket && activeConversation && connected) {
      sendSocketMessage("typing_status", {
        conversationId: activeConversation.id,
        isTyping: e.target.value.length > 0,
        isAgent: true,
        agentId: user?.id,
        agentName: user?.name
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const createPaymentRequest = async () => {
    if (!activeConversation) return;
    
    try {
      const description = prompt("Enter payment description");
      const amount = prompt("Enter payment amount (R$)");
      
      if (!description || !amount) return;
      
      const data = await apiRequest("POST", `/api/payments/request`, {
        conversationId: activeConversation.id,
        amount: parseFloat(amount),
        description
      });
      
      // Invalidate the conversations query to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${activeConversation.id}/messages`] 
      });
      
      toast({
        title: "Payment request sent",
        description: "The customer has received a payment request."
      });
      
    } catch (error) {
      console.error("Error creating payment request:", error);
      toast({
        variant: "destructive",
        title: "Error creating payment request",
        description: "The payment request could not be created. Please try again."
      });
    }
  };
  
  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-neutral-100 rounded-full mb-4">
            <i className="ri-chat-3-line text-neutral-400 text-3xl"></i>
          </div>
          <h3 className="text-xl font-medium text-neutral-800 mb-2">Nenhuma Conversa Selecionada</h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            Selecione uma conversa da lista para começar a interagir
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="outline" className="flex items-center gap-2 px-4">
              <i className="ri-whatsapp-fill text-success-500"></i>
              <span>WhatsApp</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2 px-4">
              <i className="ri-instagram-fill text-secondary-700"></i>
              <span>Instagram</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2 px-4">
              <i className="ri-facebook-fill text-primary-700"></i>
              <span>Facebook</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Group messages by date for date separators
  const messagesByDate: { [date: string]: Message[] } = {};
  messages.forEach(message => {
    const date = new Date(message.createdAt).toDateString();
    if (!messagesByDate[date]) messagesByDate[date] = [];
    messagesByDate[date].push(message);
  });
  
  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen bg-neutral-50">
      {/* Conversation header */}
      <div className="bg-white border-b border-neutral-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="relative">
            <Avatar>
              <AvatarImage src={activeConversation.contact.avatarUrl} />
              <AvatarFallback>{activeConversation.contact.name?.charAt(0) || "C"}</AvatarFallback>
            </Avatar>
            {activeConversation.contact.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div className="ml-3">
            <div className="flex items-center">
              <h3 className="text-sm font-semibold text-neutral-900">
                {activeConversation.contact.name}
              </h3>
              <div className="ml-2">
                <ChannelBadge type={activeConversation.channel.type} />
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              {activeConversation.contact.lastSeen 
                ? `Ativo em ${format(new Date(activeConversation.contact.lastSeen), 'd MMM, HH:mm', { locale: ptBR })}` 
                : "Nunca ativo"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" title="Ligar">
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={createPaymentRequest}
            title="Criar Cobrança"
          >
            <DollarSign className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Informações do Contato">
            <Info className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Mais Opções">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <AssignToAgentDropdown
                conversationId={activeConversation.id}
                currentAgentId={activeConversation.assignedTo || null}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Conversation body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="conversation-messages">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">Nenhuma mensagem ainda</p>
            <Button variant="outline" className="mt-3 text-sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar primeira mensagem
            </Button>
          </div>
        ) : (
          Object.entries(messagesByDate).map(([date, dateMessages]) => (
            <div key={date} className="space-y-4">
              <DateSeparator date={new Date(date)} />
              
              {dateMessages.map(message => (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isAgent={message.isFromAgent} 
                />
              ))}
            </div>
          ))
        )}
        
        {/* Always keep this div at the end to enable auto-scrolling */}
        <div ref={messagesEndRef}></div>
      </div>
      
      {/* Conversation input */}
      <div className="bg-white border-t border-neutral-200 p-4">
        <div className="flex items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
                <Paperclip className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-2">Anexar arquivo</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="flex flex-col items-center justify-center p-3 h-auto space-y-1" onClick={() => toast({ description: "Função de imagem será implementada em breve." })}>
                    <Image className="h-5 w-5 text-neutral-500" />
                    <span className="text-xs">Imagem</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center justify-center p-3 h-auto space-y-1" onClick={() => toast({ description: "Função de documento será implementada em breve." })}>
                    <FileText className="h-5 w-5 text-neutral-500" />
                    <span className="text-xs">Documento</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center justify-center p-3 h-auto space-y-1" onClick={() => toast({ description: "Função de áudio será implementada em breve." })}>
                    <Music className="h-5 w-5 text-neutral-500" />
                    <span className="text-xs">Áudio</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center justify-center p-3 h-auto space-y-1" onClick={() => toast({ description: "Função de vídeo será implementada em breve." })}>
                    <Video className="h-5 w-5 text-neutral-500" />
                    <span className="text-xs">Vídeo</span>
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
                <SmilePlus className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-2">Emojis</h3>
                <div className="grid grid-cols-6 gap-1">
                  {["😀", "😂", "❤️", "👍", "🙏", "🔥", "✅", "🎉", "🤔", "😊", "👋", "⭐", "🚀", "👏", "🌟", "💯", "🙌", "💪"].map((emoji) => (
                    <Button 
                      key={emoji}
                      variant="ghost" 
                      className="h-9 w-9 p-0" 
                      onClick={() => setMessageInput(prev => prev + emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="flex-1 mx-2">
            <Input
              type="text"
              placeholder="Digite sua mensagem..."
              className="w-full p-2"
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button 
            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            onClick={sendMessage}
            disabled={!messageInput.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center text-xs text-neutral-500">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center hover:text-primary-500 mr-3 p-0">
                  <Ticket className="mr-1 h-3 w-3" />
                  <span>Modelos</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium mb-2">Modelos de mensagem</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {messageTemplates?.length > 0 ? (
                      messageTemplates.map((template) => (
                        <Button 
                          key={template.id}
                          variant="outline" 
                          className="w-full flex flex-col items-start p-2 h-auto"
                          onClick={() => setMessageInput(template.content)}
                        >
                          <span className="font-medium text-xs text-left mb-1">{template.title}</span>
                          <span className="text-xs text-left text-neutral-600 line-clamp-2">{template.content}</span>
                        </Button>
                      ))
                    ) : (
                      <div className="text-center py-2 text-xs text-gray-500">
                        Carregando modelos...
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center hover:text-primary-500 p-0">
                  <Bot className="mr-1 h-3 w-3" />
                  <span>Assistente IA</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium mb-2">Assistente IA</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-between p-2"
                      onClick={async () => {
                        try {
                          setMessageInput("Gerando resposta concisa...");
                          
                          const response = await fetch("/api/ai/quick-response", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                              type: "concise",
                              messageContent: messageInput,
                              conversationId: activeConversation?.id
                            })
                          });
                          
                          const data = await response.json();
                          
                          if (response.ok) {
                            setMessageInput(data.response);
                            toast({
                              description: "Resposta gerada com sucesso",
                              duration: 3000
                            });
                          } else {
                            setMessageInput("");
                            toast({
                              variant: "destructive",
                              description: data.message || "Erro ao gerar resposta concisa",
                              duration: 5000
                            });
                          }
                        } catch (error) {
                          console.error("Erro ao gerar resposta:", error);
                          setMessageInput("");
                          toast({
                            variant: "destructive",
                            description: "Erro ao comunicar com o serviço de IA",
                            duration: 5000
                          });
                        }
                      }}
                    >
                      <span>Resposta concisa</span>
                      <span className="text-xs text-neutral-500">→</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-between p-2"
                      onClick={async () => {
                        try {
                          setMessageInput("Gerando resumo da conversa...");
                          
                          const response = await fetch("/api/ai/quick-response", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                              type: "summary",
                              messageContent: messageInput,
                              conversationId: activeConversation?.id
                            })
                          });
                          
                          const data = await response.json();
                          
                          if (response.ok) {
                            setMessageInput(data.response);
                            toast({
                              description: "Resumo gerado com sucesso",
                              duration: 3000
                            });
                          } else {
                            setMessageInput("");
                            toast({
                              variant: "destructive",
                              description: data.message || "Erro ao gerar resumo da conversa",
                              duration: 5000
                            });
                          }
                        } catch (error) {
                          console.error("Erro ao gerar resumo:", error);
                          setMessageInput("");
                          toast({
                            variant: "destructive",
                            description: "Erro ao comunicar com o serviço de IA",
                            duration: 5000
                          });
                        }
                      }}
                    >
                      <span>Resumir conversa</span>
                      <span className="text-xs text-neutral-500">→</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-between p-2"
                      onClick={async () => {
                        try {
                          if (!messageInput.trim()) {
                            toast({
                              description: "Digite um texto para corrigir",
                              duration: 3000
                            });
                            return;
                          }
                          
                          const originalText = messageInput;
                          setMessageInput("Corrigindo texto...");
                          
                          const response = await fetch("/api/ai/quick-response", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                              type: "correction",
                              messageContent: originalText,
                              conversationId: activeConversation?.id
                            })
                          });
                          
                          const data = await response.json();
                          
                          if (response.ok) {
                            setMessageInput(data.response);
                            toast({
                              description: "Texto corrigido com sucesso",
                              duration: 3000
                            });
                          } else {
                            setMessageInput(originalText);
                            toast({
                              variant: "destructive",
                              description: data.message || "Erro ao corrigir texto",
                              duration: 5000
                            });
                          }
                        } catch (error) {
                          console.error("Erro ao corrigir texto:", error);
                          setMessageInput("");
                          toast({
                            variant: "destructive",
                            description: "Erro ao comunicar com o serviço de IA",
                            duration: 5000
                          });
                        }
                      }}
                    >
                      <span>Corrigir texto</span>
                      <span className="text-xs text-neutral-500">→</span>
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {isTyping && (
            <div className="text-xs text-neutral-500">
              {activeConversation.contact.name} está digitando...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationView;
