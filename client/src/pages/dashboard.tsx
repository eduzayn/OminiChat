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
  const { socket } = useSocket();
  const { user } = useAuth();
  const { activeConversation } = useConversation();
  const { toast } = useToast();

  // Set up notifications for new messages
  useEffect(() => {
    if (socket && user) {
      const handleNewMessage = (message: Message) => {
        // If the message is not from an agent and not in the active conversation
        if (!message.isFromAgent && 
            (!activeConversation || message.conversationId !== activeConversation.id)) {
          // Show a notification
          toast({
            title: `New message from ${message.contact?.name || "Customer"}`,
            description: message.content,
            duration: 5000
          });
        }
      };
      
      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message" && data.data) {
            handleNewMessage(data.data);
          }
        } catch (error) {
          console.error("Erro ao processar mensagem WebSocket:", error);
        }
      });
      
      return () => {
        socket.removeEventListener("message", () => {});
      };
    }
  }, [socket, user, activeConversation, toast]);

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
