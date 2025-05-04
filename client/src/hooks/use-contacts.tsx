import { useQuery, useMutation } from "@tanstack/react-query";
import { Contact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function useContacts() {
  const {
    data: contacts,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      
      return response.json();
    }
  });

  const updateContact = useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number;
      data: Partial<Contact>;
    }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/contacts/${id}`, 
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  const createContact = useMutation({
    mutationFn: async (data: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
      const response = await apiRequest(
        "POST", 
        "/api/contacts", 
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  return {
    contacts,
    isLoading,
    isError,
    error,
    refetch,
    updateContact,
    createContact
  };
}
