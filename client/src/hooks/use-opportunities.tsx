import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Opportunity } from "@shared/schema";

interface CreateOpportunityData {
  title: string;
  contactId: string;
  value: string;
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "closing";
  status: "open" | "won" | "lost";
  description?: string;
  expectedCloseDate?: string;
}

export function useOpportunities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: "",
    stage: "",
    contactId: "",
  });

  // Query para buscar oportunidades com paginação e filtros
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/opportunities', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.stage) queryParams.append('stage', filters.stage);
      if (filters.contactId) queryParams.append('contactId', filters.contactId);
      
      const url = `/api/opportunities?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao buscar oportunidades');
      }
      
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Mutation para criar oportunidade
  const createOpportunity = useMutation({
    mutationFn: async (opportunityData: CreateOpportunityData) => {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...opportunityData,
          contactId: parseInt(opportunityData.contactId),
          value: parseFloat(opportunityData.value),
          expectedCloseDate: opportunityData.expectedCloseDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar oportunidade');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidar a query para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
    },
  });

  // Mutation para atualizar oportunidade
  const updateOpportunity = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateOpportunityData> }) => {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          contactId: data.contactId ? parseInt(data.contactId) : undefined,
          value: data.value ? parseFloat(data.value) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar oportunidade');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
    },
  });

  // Mutation para excluir oportunidade
  const deleteOpportunity = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir oportunidade');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
    },
  });

  // Função para atualizar filtros
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Se mudaram os filtros, voltar para a primeira página
      page: newFilters.status || newFilters.stage || newFilters.contactId ? 1 : prev.page,
    }));
  };

  return {
    opportunities: data?.data as Opportunity[] || [],
    pagination: data?.pagination || { page: 1, limit: 20, totalCount: 0, totalPages: 1 },
    isLoading,
    error,
    filters,
    updateFilters,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
}