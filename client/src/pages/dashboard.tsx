import Sidebar from "@/components/sidebar";
import ConversationList from "@/components/conversation-list";
import ConversationView from "@/components/conversation-view";
import CustomerProfile from "@/components/customer-profile";
import { Helmet } from "react-helmet";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { useConversation } from "@/context/conversation-context";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Message } from "@shared/schema";

/**
 * Dashboard é o componente principal da aplicação que exibe a caixa de entrada unificada.
 * Este componente carrega a estrutura básica da interface: barra lateral, lista de conversas,
 * visualização da conversa ativa e detalhes do cliente.
 */
function Dashboard() {
  const { user } = useAuth();
  const { activeConversation } = useConversation();
  const { toast } = useToast();
  const { socket, addListener } = useSocket();

  // Configura o listener para novas mensagens para mostrar notificações
  useEffect(() => {
    if (!socket || !user) return;

    // Log para fins de diagnóstico
    console.log("Dashboard: Configurando listener para novas mensagens");
    
    // Função que será executada quando uma nova mensagem for recebida
    const handleNewMessage = (message: Message) => {
      console.log("Dashboard: Notificação de nova mensagem recebida:", message);
      
      // Notifica apenas se a mensagem não for do agente (ou seja, é do cliente)
      // e se não for da conversa atualmente ativa
      if (!message.isFromAgent && 
          (!activeConversation || Number(message.conversationId) !== Number(activeConversation.id))) {
        toast({
          title: `Nova mensagem de ${message.contact?.name || "Cliente"}`,
          description: message.content,
          duration: 5000
        });
      }
    };
    
    // Registra o listener usando a API do socket-context
    const removeListener = addListener("new_message", handleNewMessage);
    
    // Limpa o listener quando o componente for desmontado
    return () => {
      console.log("Dashboard: Removendo listener de novas mensagens");
      removeListener();
    };
  }, [socket, user, activeConversation, toast, addListener]);

  return (
    <>
      <Helmet>
        <title>Caixa de Entrada | OmniConnect</title>
        <link 
          href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css" 
          rel="stylesheet" 
        />
      </Helmet>
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 overflow-hidden">
          <ConversationList />
          <ConversationView />
          <CustomerProfile />
        </div>
      </div>
    </>
  );
}

export default Dashboard;