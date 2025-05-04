import { useState } from "react";
import { Search, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/use-conversations";
import { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useConversation } from "@/context/conversation-context";

// Helper function to get channel icon
function getChannelIcon(channelType: string) {
  switch (channelType) {
    case "whatsapp":
      return <i className="ri-whatsapp-fill text-success-500"></i>;
    case "instagram":
      return <i className="ri-instagram-fill text-secondary-700"></i>;
    case "facebook":
      return <i className="ri-facebook-fill text-primary-700"></i>;
    default:
      return <i className="ri-chat-1-fill text-neutral-500"></i>;
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp: string | Date) {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMM d");
  }
}

function ConversationItem({ conversation, isActive, onClick }: { 
  conversation: Conversation, 
  isActive: boolean,
  onClick: () => void
}) {
  const lastMessage = conversation.lastMessage;
  
  return (
    <div 
      className={cn(
        "border-b border-neutral-200 p-4 hover:bg-neutral-50 cursor-pointer",
        isActive && "bg-primary-50"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between mb-1">
        <div className="flex items-center">
          {conversation.unreadCount > 0 && (
            <Circle className="w-2 h-2 fill-primary-500 text-primary-500 mr-2" />
          )}
          <span className="text-sm font-medium text-neutral-900">
            {conversation.contact.name}
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          {lastMessage ? formatTimestamp(lastMessage.createdAt) : ""}
        </span>
      </div>
      <div className="flex items-start">
        <div className="flex-shrink-0 w-8 h-8 mr-3">
          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center relative">
            {getChannelIcon(conversation.channel.type)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-800 truncate">
            {lastMessage?.content || "No messages yet"}
          </p>
          <p className="text-xs text-neutral-500 mt-1 truncate">
            {lastMessage?.preview || "Start a conversation"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConversationList() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations, isLoading } = useConversations();
  const { activeConversation, setActiveConversation } = useConversation();
  
  // Filter conversations based on filter and search query
  const filteredConversations = conversations?.filter(conversation => {
    const matchesFilter = filter === "all" || 
      (filter === "unassigned" && !conversation.assignedTo) || 
      (filter === "assigned" && !!conversation.assignedTo);
      
    const matchesSearch = conversation.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (conversation.lastMessage?.content || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <div className="w-80 bg-white border-r border-neutral-200 flex flex-col h-screen max-h-screen">
      {/* Header with search and filters */}
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Inbox</h2>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-neutral-400" />
          </span>
          <Input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 mt-3">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              filter === "all" ? "bg-primary-50 text-primary-700 hover:text-primary-700 hover:bg-primary-100" : ""
            )}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === "unassigned" ? "default" : "outline"}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              filter === "unassigned" ? "bg-primary-50 text-primary-700 hover:text-primary-700 hover:bg-primary-100" : ""
            )}
            onClick={() => setFilter("unassigned")}
          >
            Unassigned
          </Button>
          <Button
            size="sm"
            variant={filter === "assigned" ? "default" : "outline"}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              filter === "assigned" ? "bg-primary-50 text-primary-700 hover:text-primary-700 hover:bg-primary-100" : ""
            )}
            onClick={() => setFilter("assigned")}
          >
            Assigned
          </Button>
        </div>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-neutral-500 mt-2">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-neutral-500">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={activeConversation?.id === conversation.id}
              onClick={() => setActiveConversation(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ConversationList;
