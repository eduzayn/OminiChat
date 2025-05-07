import { useQuery, useMutation } from "@tanstack/react-query";
import { Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function useConversations() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      
      return response.json();
    }
  });
  
  // Garantir que o resultado é sempre um array, independente da resposta da API
  const conversations = Array.isArray(data) ? data : (data?.data || []);

  const assignConversation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      agentId 
    }: { 
      conversationId: number; 
      agentId: number | null 
    }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/conversations/${conversationId}/assign`, 
        { agentId }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const updateConversationStatus = useMutation({
    mutationFn: async ({ 
      conversationId, 
      status 
    }: { 
      conversationId: number; 
      status: string 
    }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/conversations/${conversationId}/status`, 
        { status }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  return {
    conversations,
    isLoading,
    isError,
    error,
    refetch,
    assignConversation,
    updateConversationStatus
  };
}
