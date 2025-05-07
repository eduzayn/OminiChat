import { useQuery, useMutation } from "@tanstack/react-query";
import { Conversation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function useConversations() {
  const {
    data: conversations,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Conversation[]>({
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
