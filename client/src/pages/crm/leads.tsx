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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarIcon,
  ChevronDown,
  Edit,
  Filter,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados temporários para simulação
const leads = [
  { 
    id: 1, 
    name: "Carolina Mendes", 
    email: "carolina@empresa.com.br", 
    phone: "+55 11 98765-4321",
    source: "Website", 
    status: "Novo",
    createdAt: new Date(2023, 4, 22), 
    lastContact: new Date(2023, 4, 22),
    assignedTo: "Admin User",
    notes: "Interessada em nossos serviços de marketing digital",
    avatar: null 
  },
  { 
    id: 2, 
    name: "Ricardo Oliveira", 
    email: "ricardo.oliveira@tech.com", 
    phone: "+55 21 99876-5432",
    source: "LinkedIn", 
    status: "Em contato",
    createdAt: new Date(2023, 4, 21), 
    lastContact: new Date(2023, 4, 23),
    assignedTo: "Admin User",
    notes: "Solicitou orçamento para desenvolvimento de aplicativo",
    avatar: "https://randomuser.me/api/portraits/men/41.jpg" 
  },
  { 
    id: 3, 
    name: "Amanda Silva", 
    email: "amanda.silva@outlook.com", 
    phone: "+55 31 98765-1234",
    source: "Indicação", 
    status: "Qualificado",
    createdAt: new Date(2023, 4, 20), 
    lastContact: new Date(2023, 4, 24),
    assignedTo: "Admin User",
    notes: "Reunião agendada para 15/05",
    avatar: "https://randomuser.me/api/portraits/women/35.jpg" 
  },
  { 
    id: 4, 
    name: "Luiz Fernandes", 
    email: "luiz.fernandes@gmail.com", 
    phone: "+55 11 97654-3210",
    source: "Google", 
    status: "Novo",
    createdAt: new Date(2023, 4, 19), 
    lastContact: null,
    assignedTo: null,
    notes: "Fez download de nosso e-book",
    avatar: null 
  },
  { 
    id: 5, 
    name: "Mariana Costa", 
    email: "mariana.costa@hotmail.com", 
    phone: "+55 47 99875-6543",
    source: "Evento", 
    status: "Convertido",
    createdAt: new Date(2023, 4, 15), 
    lastContact: new Date(2023, 4, 25),
    assignedTo: "Admin User",
    notes: "Cliente fechou contrato de consultoria mensal",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg" 
  },
];

const statusColors = {
  "Novo": "bg-blue-100 text-blue-800",
  "Em contato": "bg-yellow-100 text-yellow-800",
  "Qualificado": "bg-purple-100 text-purple-800",
  "Convertido": "bg-green-100 text-green-800",
  "Perdido": "bg-neutral-100 text-neutral-800"
};

const sourceOptions = ["Website", "LinkedIn", "Google", "Indicação", "Evento", "Email", "Telefone", "Outro"];
const statusOptions = ["Novo", "Em contato", "Qualificado", "Convertido", "Perdido"];

function LeadsManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sourceFilter, setSourceFilter] = useState("todos");
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    source: "Website",
    notes: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filtro combinado
  const filteredLeads = leads.filter(lead => {
    // Filtro de texto
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtro de status
    const matchesStatus = statusFilter === "todos" || lead.status === statusFilter;
    
    // Filtro de origem
    const matchesSource = sourceFilter === "todos" || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });
  
  const handleCreateLead = (e) => {
    e.preventDefault();
    // Aqui implementaria a lógica para criar um novo lead
    setIsDialogOpen(false);
    // Resetar o formulário
    setNewLead({
      name: "",
      email: "",
      phone: "",
      source: "Website",
      notes: ""
    });
  };
  
  return (
    <>
      <Helmet>
        <title>Gestão de Leads | CRM | OmniConnect</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6">
            <div className="flex items-center mb-6">
              <Button variant="ghost" size="icon" asChild className="mr-2">
                <Link href="/crm">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Gestão de Leads</h1>
                <p className="text-neutral-500">Acompanhe e gerencie seus leads potenciais</p>
              </div>
            </div>
            
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Leads</CardTitle>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Novo Lead</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Lead</DialogTitle>
                        <DialogDescription>
                          Preencha os dados do novo lead. Os campos marcados com * são obrigatórios.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleCreateLead}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                              id="name"
                              value={newLead.name}
                              onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                              placeholder="Nome completo"
                              required
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newLead.email}
                              onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                              placeholder="email@exemplo.com"
                              required
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                              id="phone"
                              value={newLead.phone}
                              onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                              placeholder="+55 (11) 98765-4321"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="source">Origem</Label>
                            <Select
                              value={newLead.source}
                              onValueChange={(value) => setNewLead({...newLead, source: value})}
                            >
                              <SelectTrigger id="source">
                                <SelectValue placeholder="Selecione a origem" />
                              </SelectTrigger>
                              <SelectContent>
                                {sourceOptions.map(source => (
                                  <SelectItem key={source} value={source}>
                                    {source}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="notes">Observações</Label>
                            <textarea
                              id="notes"
                              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={newLead.notes}
                              onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                              placeholder="Observações sobre o lead"
                            />
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit">Criar Lead</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                      <Input
                        placeholder="Buscar leads..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os status</SelectItem>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as origens</SelectItem>
                        {sourceOptions.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Data de criação</TableHead>
                      <TableHead>Último contato</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={lead.avatar || undefined} />
                                <AvatarFallback className="bg-primary-50 text-primary-700">
                                  {lead.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{lead.name}</div>
                                <div className="text-xs text-neutral-500">
                                  {lead.email} • {lead.phone}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[lead.status]} font-normal`}>
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{lead.source}</TableCell>
                          <TableCell>{format(lead.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell>
                            {lead.lastContact 
                              ? format(lead.lastContact, 'dd/MM/yyyy', { locale: ptBR })
                              : "Sem contato"}
                          </TableCell>
                          <TableCell>
                            {lead.assignedTo || "Não atribuído"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Abrir menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                  <User className="mr-2 h-4 w-4" />
                                  <span>Ver detalhes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Phone className="mr-2 h-4 w-4" />
                                  <span>Registrar contato</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  <span>Agendar atividade</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar lead</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Excluir lead</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {searchQuery || statusFilter !== "todos" || sourceFilter !== "todos" ? (
                            <div>
                              <p className="text-neutral-500">Nenhum lead encontrado com os filtros aplicados.</p>
                            </div>
                          ) : (
                            <div>
                              <Users className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
                              <p className="text-neutral-500">Nenhum lead cadastrado. Adicione seu primeiro lead para começar.</p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {filteredLeads.length > 0 && (
                <CardFooter className="flex justify-between border-t px-6 py-4">
                  <div className="text-sm text-neutral-500">
                    Mostrando {filteredLeads.length} de {leads.length} leads
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Próximo
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default LeadsManagement;