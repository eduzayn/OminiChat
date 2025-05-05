import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  DollarSign,
  Edit,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useOpportunities } from "@/hooks/use-opportunities";
import { useContacts } from "@/hooks/use-contacts";
import { OpportunityForm } from "@/components/opportunity-form";
import { useToast } from "@/hooks/use-toast";
import { Opportunity } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Definição dos estágios do pipeline
const pipelineStages = [
  { id: "prospecting", name: "Prospecção", color: "bg-blue-500" },
  { id: "qualification", name: "Qualificação", color: "bg-indigo-500" },
  { id: "proposal", name: "Proposta", color: "bg-purple-500" },
  { id: "negotiation", name: "Negociação", color: "bg-pink-500" },
  { id: "closing", name: "Fechamento", color: "bg-rose-500" },
];

// Mapeamento de status para componentes visuais
const statusColors = {
  open: { bg: "bg-blue-100", text: "text-blue-700", label: "Em aberto" },
  won: { bg: "bg-green-100", text: "text-green-700", label: "Ganho" },
  lost: { bg: "bg-red-100", text: "text-red-700", label: "Perdido" },
};

function DealCard({ opportunity, onUpdate, onDelete }: { 
  opportunity: Opportunity; 
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleStatusChange = async (status: "open" | "won" | "lost") => {
    try {
      setIsUpdating(true);
      await onUpdate(opportunity.id, { status });
      toast({
        title: "Status atualizado",
        description: `Oportunidade marcada como ${statusColors[status].label.toLowerCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      await onDelete(opportunity.id);
      toast({
        title: "Oportunidade excluída",
        description: "A oportunidade foi excluída com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a oportunidade.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Extrair o status atual da oportunidade
  const status = opportunity.status as keyof typeof statusColors;
  
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <h3 className="font-medium text-neutral-900">{opportunity.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${statusColors[status].bg} ${statusColors[status].text} border-0`}>
                {statusColors[status].label}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                <span className="sr-only">Opções</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => handleStatusChange("won")}
                disabled={status === "won" || isUpdating}
              >
                <Check className="mr-2 h-4 w-4 text-green-600" />
                <span>Marcar como ganho</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => handleStatusChange("lost")}
                disabled={status === "lost" || isUpdating}
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                <span>Marcar como perdido</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => handleStatusChange("open")}
                disabled={status === "open" || isUpdating}
              >
                <Clock className="mr-2 h-4 w-4 text-blue-600" />
                <span>Reabrir</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive"
                onClick={handleDelete}
                disabled={isUpdating}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir negócio</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={opportunity.contact?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary-50 text-primary-700">
                {opportunity.contact?.name.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{opportunity.contact?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-green-600">
            <DollarSign className="h-4 w-4" />
            {parseFloat(opportunity.value.toString()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        {opportunity.expectedCloseDate && (
          <div className="grid grid-cols-1 gap-2 mb-3">
            <div className="text-xs text-neutral-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Vence: {format(parseISO(opportunity.expectedCloseDate.toString()), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
          </div>
        )}

        {opportunity.description && (
          <div className="text-xs text-neutral-600 mt-2 line-clamp-2">
            {opportunity.description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineView() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Buscar dados
  const { 
    opportunities, 
    isLoading, 
    error, 
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    filters,
    updateFilters
  } = useOpportunities();
  
  const { contacts } = useContacts();
  
  // Se o usuário não estiver autenticado, redireciona para o login
  if (!user) {
    navigate("/login");
    return null;
  }
  
  // Exibir mensagem de erro se falhar ao carregar
  if (error) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Erro ao carregar dados</h2>
            <p className="text-neutral-600">Não foi possível carregar as oportunidades.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Filtrar oportunidades por pesquisa e status
  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = 
      opportunity.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      opportunity.contact?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opportunity.description && opportunity.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || opportunity.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Agrupar negócios por estágio
  const dealsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredOpportunities.filter(opportunity => opportunity.stage === stage.id);
    return acc;
  }, {} as Record<string, Opportunity[]>);
  
  // Calcular totais por estágio
  const stageTotals = pipelineStages.map(stage => {
    const stageDeals = dealsByStage[stage.id] || [];
    return {
      ...stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, deal) => sum + parseFloat(deal.value.toString()), 0)
    };
  });
  
  // Calcular valor total do pipeline
  const totalPipelineValue = stageTotals.reduce((total, stage) => total + stage.value, 0);
  
  // Handler para criar nova oportunidade
  const handleCreateOpportunity = async (data: any) => {
    try {
      await createOpportunity.mutateAsync(data);
      toast({
        title: "Oportunidade criada",
        description: "A oportunidade foi criada com sucesso.",
      });
      return Promise.resolve();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a oportunidade.",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };
  
  // Handler para atualizar oportunidade
  const handleUpdateOpportunity = async (id: number, data: any) => {
    try {
      await updateOpportunity.mutateAsync({ id, data });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };
  
  // Handler para excluir oportunidade
  const handleDeleteOpportunity = async (id: number) => {
    try {
      await deleteOpportunity.mutateAsync(id);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Pipeline de Vendas | CRM | OmniConnect</title>
      </Helmet>

      {/* Modal de criação de oportunidade */}
      <OpportunityForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOpportunity}
        contacts={contacts || []}
      />

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6">
            <div className="mb-6">
              <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" asChild className="mr-2">
                  <Link href="/crm">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">Pipeline de Vendas</h1>
                  <p className="text-neutral-500">Visualize e gerencie seus negócios em andamento</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="w-full md:w-80">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      placeholder="Buscar por título, contato ou descrição..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <div className="w-full md:w-auto">
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="min-w-[180px]">
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="open">Em aberto</SelectItem>
                        <SelectItem value="won">Ganhos</SelectItem>
                        <SelectItem value="lost">Perdidos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nova Oportunidade</span>
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-neutral-600">Carregando oportunidades...</span>
                </div>
              ) : opportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-neutral-50">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-neutral-800 mb-2">Seu pipeline está vazio</h2>
                    <p className="text-neutral-600 max-w-md">
                      Comece a adicionar oportunidades para visualizar seu funil de vendas e acompanhar o progresso dos seus negócios.
                    </p>
                  </div>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Criar primeira oportunidade</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {pipelineStages.map((stage) => {
                    const stageDeals = dealsByStage[stage.id] || [];
                    const total = stageTotals.find(s => s.id === stage.id);
                    
                    return (
                      <div key={stage.id} className="flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${stage.color}`}></div>
                            <h3 className="font-medium">{stage.name}</h3>
                          </div>
                          <div className="text-xs text-neutral-500">
                            {total?.count || 0} • {(total?.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                        
                        <div className="bg-neutral-50 rounded-lg p-2 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                          {stageDeals.length > 0 ? (
                            stageDeals.map(opportunity => (
                              <DealCard 
                                key={opportunity.id} 
                                opportunity={opportunity}
                                onUpdate={handleUpdateOpportunity}
                                onDelete={handleDeleteOpportunity}
                              />
                            ))
                          ) : (
                            <div className="h-20 border border-dashed rounded-lg flex items-center justify-center text-neutral-400 text-sm">
                              Sem oportunidades
                            </div>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            className="w-full mt-2 border border-dashed text-neutral-500"
                            onClick={() => setIsFormOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar oportunidade
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PipelineView;