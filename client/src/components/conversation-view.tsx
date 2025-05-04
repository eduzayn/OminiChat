import { useState, useRef, useEffect } from "react";
import { useConversation } from "@/context/conversation-context";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message } from "@shared/schema";
import { 
  Phone, 
  DollarSign, 
  Info, 
  MoreHorizontal, 
  Paperclip, 
  SmilePlus, 
  Send,
  Ticket,
  Bot
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    label = "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = "Yesterday";
  } else {
    label = format(date, "MMMM d, yyyy");
  }
  
  return (
    <div className="flex justify-center">
      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

function ConversationView() {
  const { activeConversation } = useConversation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Fetch messages for the active conversation
  useEffect(() => {
    if (activeConversation) {
      setIsLoading(true);
      fetch(`/api/conversations/${activeConversation.id}/messages`)
        .then(res => res.json())
        .then(data => {
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
    if (socket && activeConversation) {
      const handleNewMessage = (message: Message) => {
        if (message.conversationId === activeConversation.id) {
          setMessages(prev => [...prev, message]);
          
          // Mark as read if it's a client message
          if (!message.isFromAgent) {
            apiRequest("PATCH", `/api/conversations/${activeConversation.id}/messages/${message.id}/read`, {})
              .catch(err => console.error("Error marking message as read:", err));
          }
        }
      };
      
      const handleTypingStatus = (data: any) => {
        if (data.conversationId === activeConversation.id && !data.isAgent) {
          setIsTyping(data.isTyping);
        }
      };
      
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          handleNewMessage(data.message);
        } else if (data.type === "typing_status") {
          handleTypingStatus(data.data);
        }
      });
      
      return () => {
        socket.removeEventListener("message", () => {});
      };
    }
  }, [socket, activeConversation]);
  
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;
    
    try {
      const response = await apiRequest("POST", `/api/conversations/${activeConversation.id}/messages`, {
        content: messageInput,
        isFromAgent: true,
        agentId: user?.id
      });
      
      const newMessage = await response.json();
      
      // Optimistically add the message to the UI
      setMessages(prev => [...prev, newMessage]);
      
      // Clear the input
      setMessageInput("");
      
      // Invalidate the conversations query to update the last message preview
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: "Your message could not be sent. Please try again."
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Send typing status through socket
    if (socket && activeConversation) {
      socket.send(JSON.stringify({
        type: "typing_status",
        data: {
          conversationId: activeConversation.id,
          isTyping: e.target.value.length > 0,
          isAgent: true
        }
      }));
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
      
      const response = await apiRequest("POST", `/api/payments/request`, {
        conversationId: activeConversation.id,
        amount: parseFloat(amount),
        description
      });
      
      const data = await response.json();
      
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
            <i className="ri-chat-3-line text-neutral-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-neutral-800 mb-2">No Conversation Selected</h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            Select a conversation from the list to start chatting
          </p>
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
                ? `Last active ${format(new Date(activeConversation.contact.lastSeen), 'MMM d, h:mm a')}` 
                : "Never active"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" title="Call">
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={createPaymentRequest}
            title="Create Payment Request"
          >
            <DollarSign className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Contact Info">
            <Info className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" title="More Options">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
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
            <p className="text-sm text-neutral-500">No messages yet</p>
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
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700">
            <SmilePlus className="h-5 w-5" />
          </Button>
          <div className="flex-1 mx-2">
            <Input
              type="text"
              placeholder="Type your message..."
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
            <Button variant="ghost" className="flex items-center hover:text-primary-500 mr-3 p-0">
              <Ticket className="mr-1 h-3 w-3" />
              <span>Templates</span>
            </Button>
            <Button variant="ghost" className="flex items-center hover:text-primary-500 p-0">
              <Bot className="mr-1 h-3 w-3" />
              <span>AI Assist</span>
            </Button>
          </div>
          {isTyping && (
            <div className="text-xs text-neutral-500">
              {activeConversation.contact.name} is typing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationView;
