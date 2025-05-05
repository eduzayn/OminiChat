import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Sidebar } from "@/components/sidebar";
import { useContacts } from "@/hooks/use-contacts";
import { useOpportunities } from "@/hooks/use-opportunities";
import { OpportunityForm } from "@/components/opportunity-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart3,
  Contact,
  DollarSign,
  Filter,
  FilterIcon,
  Inbox,
  List,
  PieChart,
  Plus,
  Search,
  Tag,
  Trash2,
  Users
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

// Temporário: Mock de dados para o dashboard
const dealStages = [
  { id: 1, name: "Prospecção", count: 12, value: 34500, color: "bg-blue-500" },
  { id: 2, name: "Qualificação", count: 8, value: 27800, color: "bg-indigo-500" },
  { id: 3, name: "Proposta", count: 5, value: 22300, color: "bg-purple-500" },
  { id: 4, name: "Negociação", count: 3, value: 18750, color: "bg-pink-500" },
  { id: 5, name: "Fechamento", count: 2, value: 12450, color: "bg-rose-500" },
];

const recentLeads = [
  { 
    id: 1, 
    name: "Carolina Mendes", 
    email: "carolina@empresa.com.br", 
    source: "Website", 
    date: new Date(2023, 4, 22), 
    avatar: null 
  },
  { 
    id: 2, 
    name: "Ricardo Oliveira", 
    email: "ricardo.oliveira@tech.com", 
    source: "LinkedIn", 
    date: new Date(2023, 4, 21), 
    avatar: "https://randomuser.me/api/portraits/men/41.jpg" 
  },
  { 
    id: 3, 
    name: "Amanda Silva", 
    email: "amanda.silva@outlook.com", 
    source: "Indicação", 
    date: new Date(2023, 4, 20), 
    avatar: "https://randomuser.me/api/portraits/women/35.jpg" 
  },
];

const opportunityStats = {
  won: { count: 24, value: 68500 },
  lost: { count: 14, value: 42350 },
  open: { count: 32, value: 116800 },
  conversionRate: 63,
};

function CRMDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("visão-geral");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { contacts } = useContacts();
  const { createOpportunity } = useOpportunities();
  
  // Calcula o valor total dos negócios em andamento
  const totalPipelineValue = dealStages.reduce((total, stage) => total + stage.value, 0);
  
  // Manipulador de submissão do formulário
  const handleCreateOpportunity = async (data: any) => {
    await createOpportunity.mutateAsync(data);
  };
  
  return (
    <>
      <Helmet>
        <title>CRM | OmniConnect</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">CRM</h1>
                  <p className="text-neutral-500">Gerencie seu pipeline de vendas e oportunidades</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </Button>
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nova Oportunidade</span>
                  </Button>
                </div>
              </div>
              
              <Tabs defaultValue="visão-geral" onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid grid-cols-5 w-full max-w-4xl">
                  <TabsTrigger value="visão-geral">Visão Geral</TabsTrigger>
                  <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                  <TabsTrigger value="contatos">Contatos</TabsTrigger>
                  <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                </TabsList>
                
                <TabsContent value="visão-geral" className="mt-6 space-y-6">
                  {/* Resumo dos números */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Negócios Abertos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold">{opportunityStats.open.count}</div>
                          <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                            <FilterIcon className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="text-sm text-neutral-500 mt-1">
                          Valor estimado: {opportunityStats.open.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Negócios Ganhos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold">{opportunityStats.won.count}</div>
                          <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                            <DollarSign className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="text-sm text-neutral-500 mt-1">
                          Valor fechado: {opportunityStats.won.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-500">Taxa de Conversão</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold">{opportunityStats.conversionRate}%</div>
                          <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                            <PieChart className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <Progress value={opportunityStats.conversionRate} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Pipeline e Leads Recentes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Pipeline de Vendas</CardTitle>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href="/crm/pipeline">Ver todos</Link>
                          </Button>
                        </div>
                        <CardDescription>
                          Distribuição de negócios por etapa do funil de vendas
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-4">
                          {dealStages.map((stage) => (
                            <li key={stage.id}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{stage.name}</span>
                                <span className="text-sm text-neutral-500">
                                  {stage.count} negócios • {(stage.value / totalPipelineValue * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center">
                                <div className={`h-2 ${stage.color} rounded-l-full`} style={{ width: `${stage.value / totalPipelineValue * 100}%` }}></div>
                                <div className="h-2 bg-neutral-100 flex-grow rounded-r-full"></div>
                              </div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {stage.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Leads Recentes</CardTitle>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href="/crm/leads">Ver todos</Link>
                          </Button>
                        </div>
                        <CardDescription>
                          Novos leads adicionados recentemente
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-4">
                          {recentLeads.map((lead) => (
                            <li key={lead.id} className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={lead.avatar || undefined} />
                                <AvatarFallback className="bg-primary-50 text-primary-700">
                                  {lead.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-grow">
                                <div className="font-medium">{lead.name}</div>
                                <div className="text-sm text-neutral-500 flex items-center gap-2">
                                  {lead.email}
                                  <span className="inline-block h-1 w-1 bg-neutral-300 rounded-full"></span>
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {lead.source}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-neutral-500">
                                {format(lead.date, 'dd MMM', { locale: ptBR })}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="pipeline" className="mt-6">
                  <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-medium">Pipeline de Vendas</h3>
                    <Button asChild>
                      <Link href="/crm/pipeline">
                        Ver Pipeline Completo
                      </Link>
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <ul className="space-y-4 py-2">
                        {dealStages.map((stage) => (
                          <li key={stage.id}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${stage.color}`}></div>
                                <span className="text-sm font-medium">{stage.name}</span>
                              </div>
                              <span className="text-sm text-neutral-500">
                                {stage.count} negócios • {(stage.value / totalPipelineValue * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center">
                              <div className={`h-2 ${stage.color} rounded-l-full`} style={{ width: `${stage.value / totalPipelineValue * 100}%` }}></div>
                              <div className="h-2 bg-neutral-100 flex-grow rounded-r-full"></div>
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">
                              {stage.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="leads" className="mt-6">
                  <div className="relative">
                    <div className="border rounded-lg p-6 text-center">
                      <Users className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
                      <h3 className="text-lg font-medium">Gestão de Leads</h3>
                      <p className="text-neutral-500 mb-4">
                        Esta funcionalidade será implementada em breve. Aqui você poderá capturar e gerenciar todos os seus leads.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="contatos" className="mt-6">
                  <div className="flex justify-between mb-4">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                      <Input placeholder="Buscar contatos..." className="pl-8" />
                    </div>
                    <Button asChild>
                      <Link href="/contacts">
                        Ver Lista Completa
                      </Link>
                    </Button>
                  </div>
                  <div className="border rounded-lg p-6 text-center">
                    <Contact className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
                    <h3 className="text-lg font-medium">Contatos e Clientes</h3>
                    <p className="text-neutral-500 mb-4">
                      Esta seção estará integrada com sua lista de contatos existente. Você poderá categorizar contatos, adicionar notas e histórico de interações.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="relatorios" className="mt-6">
                  <div className="border rounded-lg p-6 text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
                    <h3 className="text-lg font-medium">Relatórios e Analytics</h3>
                    <p className="text-neutral-500 mb-4">
                      Esta funcionalidade será implementada em breve. Aqui você poderá visualizar estatísticas detalhadas sobre seu funil de vendas, taxa de conversão e desempenho da equipe.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Nova Oportunidade */}
      <OpportunityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOpportunity}
        contacts={contacts || []}
      />
    </>
  );
}

export default CRMDashboard;