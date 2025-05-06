import Sidebar from "@/components/sidebar";
import ConversationList from "@/components/conversation-list";
import ConversationView from "@/components/conversation-view";
import CustomerProfile from "@/components/customer-profile";
import { Helmet } from "react-helmet";
import { useEffect } from "react";
import { useConversation } from "@/context/conversation-context";
import { useSocket } from "@/context/socket-context";
import { useAuth } from "@/context/auth-context";
import { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function Dashboard() {
  const { socket, addListener } = useSocket();
  const { user } = useAuth();
  const { activeConversation } = useConversation();
  const { toast } = useToast();

  // Set up notifications for new messages using the proper socket addListener API
  useEffect(() => {
    if (socket && user) {
      const handleNewMessage = (message: Message) => {
        // Log para diagnóstico
        console.log("Dashboard: Notificação de nova mensagem recebida:", message);
        
        // If the message is not from an agent and not in the active conversation
        if (!message.isFromAgent && 
            (!activeConversation || Number(message.conversationId) !== Number(activeConversation.id))) {
          // Show a notification
          toast({
            title: `Nova mensagem de ${message.contact?.name || "Cliente"}`,
            description: message.content,
            duration: 5000
          });
        }
      };
      
      // Usar a função addListener que já foi importada no topo do componente
      const removeListener = addListener("new_message", handleNewMessage);
      
      return () => {
        // Limpar listener ao desmontar
        removeListener();
      };
    }
  }, [socket, user, activeConversation, toast, addListener]);

  return (
    <>
      <Helmet>
        <title>Dashboard | OmniConnect</title>
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
