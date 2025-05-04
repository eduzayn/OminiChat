import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/context/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados temporários para simulação
const pipelineStages = [
  { id: 1, name: "Prospecção", color: "bg-blue-500" },
  { id: 2, name: "Qualificação", color: "bg-indigo-500" },
  { id: 3, name: "Proposta", color: "bg-purple-500" },
  { id: 4, name: "Negociação", color: "bg-pink-500" },
  { id: 5, name: "Fechamento", color: "bg-rose-500" },
];

const deals = [
  {
    id: 1,
    title: "Desenvolvimento de E-commerce",
    company: "Tech Solutions Ltda.",
    contactName: "João Silva",
    contactAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
    value: 32000,
    probability: 70,
    stage: 1,
    dueDate: new Date(2023, 5, 15),
    lastActivity: new Date(2023, 4, 28),
    tags: ["E-commerce", "Desenvolvimento"],
  },
  {
    id: 2,
    title: "Consultoria em Marketing Digital",
    company: "Agência Mídia",
    contactName: "Ana Martins",
    contactAvatar: "https://randomuser.me/api/portraits/women/55.jpg",
    value: 12500,
    probability: 60,
    stage: 2,
    dueDate: new Date(2023, 5, 22),
    lastActivity: new Date(2023, 4, 25),
    tags: ["Marketing", "Consultoria"],
  },
  {
    id: 3,
    title: "Implementação de CRM",
    company: "Lojas Virtuais S.A.",
    contactName: "Carlos Oliveira",
    contactAvatar: "https://randomuser.me/api/portraits/men/67.jpg",
    value: 45000,
    probability: 80,
    stage: 3,
    dueDate: new Date(2023, 6, 10),
    lastActivity: new Date(2023, 4, 30),
    tags: ["CRM", "Implementação"],
  },
  {
    id: 4,
    title: "Suporte Técnico Anual",
    company: "Distribuidora Express",
    contactName: "Teresa Almeida",
    contactAvatar: null,
    value: 18750,
    probability: 90,
    stage: 4,
    dueDate: new Date(2023, 5, 5),
    lastActivity: new Date(2023, 5, 1),
    tags: ["Suporte", "Contrato Anual"],
  },
  {
    id: 5,
    title: "Renovação de Licenças",
    company: "Construtora Horizonte",
    contactName: "Ricardo Pereira",
    contactAvatar: null,
    value: 8900,
    probability: 95,
    stage: 5,
    dueDate: new Date(2023, 5, 3),
    lastActivity: new Date(2023, 5, 2),
    tags: ["Renovação", "Licenças"],
  },
];

function DealCard({ deal }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-neutral-900">{deal.title}</h3>
            <p className="text-sm text-neutral-500">{deal.company}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Opções</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                <span>Editar negócio</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Check className="mr-2 h-4 w-4" />
                <span>Marcar como ganho</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Excluir negócio</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={deal.contactAvatar || undefined} />
              <AvatarFallback className="bg-primary-50 text-primary-700">
                {deal.contactName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{deal.contactName}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-green-600">
            <DollarSign className="h-4 w-4" />
            {deal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-xs text-neutral-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Vence: {format(deal.dueDate, 'dd/MM/yyyy', { locale: ptBR })}
          </div>
          <div className="text-xs text-neutral-500 flex items-center gap-1 justify-end">
            <CircleDollarSign className="h-3.5 w-3.5" />
            Probabilidade: {deal.probability}%
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {deal.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs bg-primary-50 text-primary-700 border-primary-200">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineView() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filtro de pesquisa
  const filteredDeals = deals.filter(deal => 
    deal.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    deal.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deal.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Agrupar negócios por estágio
  const dealsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredDeals.filter(deal => deal.stage === stage.id);
    return acc;
  }, {});
  
  // Calcular totais por estágio
  const stageTotals = pipelineStages.map(stage => {
    const stageDeals = dealsByStage[stage.id] || [];
    return {
      ...stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, deal) => sum + deal.value, 0)
    };
  });
  
  return (
    <>
      <Helmet>
        <title>Pipeline de Vendas | CRM | OmniConnect</title>
      </Helmet>

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
              
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-80">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                  <Input
                    placeholder="Buscar negócios por título, empresa ou contato..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Novo Negócio</span>
                  </Button>
                </div>
              </div>
              
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
                          stageDeals.map(deal => (
                            <DealCard key={deal.id} deal={deal} />
                          ))
                        ) : (
                          <div className="h-20 border border-dashed rounded-lg flex items-center justify-center text-neutral-400 text-sm">
                            Sem negócios
                          </div>
                        )}
                        
                        <Button variant="ghost" className="w-full mt-2 border border-dashed text-neutral-500">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar negócio
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PipelineView;