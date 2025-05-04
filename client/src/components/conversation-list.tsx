import { useState } from "react";
import { 
  Search, 
  Circle, 
  Filter, 
  X, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/use-conversations";
import { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, subDays } from "date-fns";
import { useConversation } from "@/context/conversation-context";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ptBR } from "date-fns/locale";

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
    return format(date, "HH:mm", { locale: ptBR });
  } else if (isYesterday(date)) {
    return "Ontem";
  } else {
    return format(date, "d MMM", { locale: ptBR });
  }
}

function ConversationStatus({ status }: { status: string }) {
  switch (status) {
    case "open":
      return (
        <Badge variant="outline" className="text-xs bg-success-50 text-success-700 border-success-200">
          <Clock className="w-3 h-3 mr-1" />
          Aberto
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="outline" className="text-xs bg-neutral-50 text-neutral-700 border-neutral-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Concluído
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-xs bg-warning-50 text-warning-700 border-warning-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
      );
    default:
      return null;
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
        "border-b border-neutral-200 p-4 hover:bg-neutral-50 cursor-pointer transition-colors",
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
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm text-neutral-800 truncate pr-2">
              {lastMessage?.content || "Sem mensagens"}
            </p>
            <ConversationStatus status={conversation.status} />
          </div>
          <div className="flex items-center text-xs text-neutral-500">
            <span className="truncate mr-1 capitalize">
              {conversation.channel.type}
            </span>
            {conversation.assignedTo ? (
              <span className="flex items-center text-xs ml-2">
                <User className="h-3 w-3 mr-1 text-primary-500" />
                <span className="truncate">{conversation.assignedUser?.name || "Atribuído"}</span>
              </span>
            ) : (
              <span className="text-xs ml-2 text-warning-500">Não atribuído</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations, isLoading, updateConversationStatus } = useConversations();
  const { activeConversation, setActiveConversation } = useConversation();
  
  // Get unique channel types for filter
  const channelTypes = conversations 
    ? [...new Set(conversations.map(c => c.channel.type))]
    : [];
  
  // Filter conversations based on multiple criteria
  const filteredConversations = conversations?.filter(conversation => {
    // Match assignment filter
    const matchesAssignment = 
      assignmentFilter === "all" || 
      (assignmentFilter === "unassigned" && !conversation.assignedTo) || 
      (assignmentFilter === "assigned" && !!conversation.assignedTo);
    
    // Match status filter
    const matchesStatus = 
      statusFilter === "all" || 
      conversation.status === statusFilter;
    
    // Match channel filter
    const matchesChannel = 
      channelFilter === "all" || 
      conversation.channel.type === channelFilter;
    
    // Match date filter
    let matchesDate = true;
    const lastMessageDate = conversation.lastMessageAt 
      ? new Date(conversation.lastMessageAt)
      : null;
    
    if (dateFilter === "today") {
      matchesDate = lastMessageDate ? isToday(lastMessageDate) : false;
    } else if (dateFilter === "yesterday") {
      matchesDate = lastMessageDate ? isYesterday(lastMessageDate) : false;
    } else if (dateFilter === "week") {
      const weekAgo = subDays(new Date(), 7);
      matchesDate = lastMessageDate ? lastMessageDate >= weekAgo : false;
    }
    
    // Match search query
    const matchesSearch = 
      conversation.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (conversation.lastMessage?.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesAssignment && matchesStatus && matchesChannel && matchesDate && matchesSearch;
  }) || [];

  // Count active filters
  const activeFiltersCount = [
    statusFilter !== "all",
    channelFilter !== "all",
    assignmentFilter !== "all",
    dateFilter !== "all"
  ].filter(Boolean).length;

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter("all");
    setChannelFilter("all");
    setAssignmentFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="w-80 bg-white border-r border-neutral-200 flex flex-col h-screen max-h-screen">
      {/* Header with search and filters */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-neutral-900">Caixa de Entrada</h2>
          <div className="relative">
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={resetFilters}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-neutral-500">Status</DropdownMenuLabel>
                  <DropdownMenuItem 
                    className={cn(statusFilter === "all" && "bg-primary-50 text-primary-700")}
                    onClick={() => setStatusFilter("all")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span>Todas</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={cn(statusFilter === "open" && "bg-primary-50 text-primary-700")}
                    onClick={() => setStatusFilter("open")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Abertas</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={cn(statusFilter === "closed" && "bg-primary-50 text-primary-700")}
                    onClick={() => setStatusFilter("closed")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    <span>Concluídas</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-neutral-500">Canal</DropdownMenuLabel>
                  <DropdownMenuItem 
                    className={cn(channelFilter === "all" && "bg-primary-50 text-primary-700")}
                    onClick={() => setChannelFilter("all")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span>Todos os canais</span>
                  </DropdownMenuItem>
                  {channelTypes.map(type => (
                    <DropdownMenuItem 
                      key={type}
                      className={cn(channelFilter === type && "bg-primary-50 text-primary-700")}
                      onClick={() => setChannelFilter(type)}
                    >
                      <span className="mr-2">{getChannelIcon(type)}</span>
                      <span className="capitalize">{type}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-neutral-500">Data</DropdownMenuLabel>
                  <DropdownMenuItem 
                    className={cn(dateFilter === "all" && "bg-primary-50 text-primary-700")}
                    onClick={() => setDateFilter("all")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Qualquer data</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={cn(dateFilter === "today" && "bg-primary-50 text-primary-700")}
                    onClick={() => setDateFilter("today")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Hoje</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={cn(dateFilter === "yesterday" && "bg-primary-50 text-primary-700")}
                    onClick={() => setDateFilter("yesterday")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Ontem</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={cn(dateFilter === "week" && "bg-primary-50 text-primary-700")}
                    onClick={() => setDateFilter("week")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Últimos 7 dias</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="relative mb-3">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-neutral-400" />
          </span>
          <Input
            type="text"
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={assignmentFilter === "all" ? "default" : "outline"}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              assignmentFilter === "all" ? "bg-primary-50 text-primary-700 hover:text-primary-700 hover:bg-primary-100" : ""
            )}
            onClick={() => setAssignmentFilter("all")}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={assignmentFilter === "unassigned" ? "default" : "outline"}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              assignmentFilter === "unassigned" ? "bg-primary-50 text-primary-700 hover:text-primary-700 hover:bg-primary-100" : ""
            )}
            onClick={() => setAssignmentFilter("unassigned")}
          >
            Não Atribuídas
          </Button>
          <Button
            size="sm"
            variant={assignmentFilter === "assigned" ? "default" : "outline"}
            className={cn(
              "px-3 py-1 text-xs font-medium",
              assignmentFilter === "assigned" ? "bg-primary-50 text-primary-700 hover:text-primary-700 hover:bg-primary-100" : ""
            )}
            onClick={() => setAssignmentFilter("assigned")}
          >
            Atribuídas
          </Button>
        </div>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-neutral-500 mt-2">Carregando conversas...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-neutral-100 rounded-full mx-auto flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700">Nenhuma conversa encontrada</p>
            <p className="text-xs text-neutral-500 mt-1">
              Tente ajustar seus filtros ou criar uma nova conversa
            </p>
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
