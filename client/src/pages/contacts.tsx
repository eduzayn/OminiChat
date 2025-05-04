import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Sidebar } from "@/components/sidebar";
import { useContacts } from "@/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { 
  PlusCircle, 
  MoreVertical, 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  MessageCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Contact } from "@shared/schema";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function ContactsPage() {
  const { contacts, isLoading, createContact } = useContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    location: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const filteredContacts = contacts?.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (contact.phone && contact.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createContact.mutateAsync({
        ...newContact,
        tags: [],
        isOnline: false,
        metadata: {},
        avatarUrl: null,
        lastSeen: null
        // Os campos createdAt, updatedAt serão preenchidos pelo backend
      });
      
      setNewContact({
        name: "",
        email: "",
        phone: "",
        location: ""
      });
      
      setIsDialogOpen(false);
      
      toast({
        title: "Contato criado com sucesso",
        description: `${newContact.name} foi adicionado à sua lista de contatos.`
      });
    } catch (error) {
      console.error("Erro ao criar contato:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar contato",
        description: "Não foi possível criar o contato. Verifique os dados e tente novamente."
      });
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Contatos | OmniConnect</title>
      </Helmet>
      
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Contatos</h1>
                <p className="text-neutral-500">Gerencie todos os seus contatos em um só lugar</p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus size={16} />
                    <span>Novo Contato</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Contato</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do novo contato. Todos os campos marcados com * são obrigatórios.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreateContact}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={newContact.name}
                          onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                          placeholder="Nome completo"
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                          placeholder="+55 (11) 98765-4321"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="location">Localização</Label>
                        <Input
                          id="location"
                          value={newContact.location}
                          onChange={(e) => setNewContact({...newContact, location: e.target.value})}
                          placeholder="Cidade, Estado"
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
                      <Button type="submit">Criar Contato</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Lista de Contatos</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      placeholder="Buscar contatos..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <CardDescription>
                  {contacts ? `Total de ${contacts.length} contatos cadastrados` : 'Carregando contatos...'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <span className="ml-2 text-neutral-500">Carregando contatos...</span>
                  </div>
                ) : filteredContacts && filteredContacts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Etiquetas</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={contact.avatarUrl || undefined} />
                                <AvatarFallback className="bg-primary-50 text-primary-700">
                                  {contact.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{contact.name}</div>
                                {contact.isOnline ? (
                                  <div className="flex items-center text-xs text-success-600">
                                    <span className="mr-1.5 h-2 w-2 rounded-full bg-success-500"></span>
                                    Online
                                  </div>
                                ) : (
                                  <div className="text-xs text-neutral-500">
                                    {contact.lastSeen ? `Visto por último ${format(new Date(contact.lastSeen), 'dd/MM/yyyy', { locale: ptBR })}` : 'Offline'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {contact.email && <div className="text-sm">{contact.email}</div>}
                              {contact.phone && <div className="text-sm text-neutral-600">{contact.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.location || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(contact.tags) && contact.tags.length > 0 ? (
                                contact.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-neutral-400 text-sm">Sem etiquetas</span>
                              )}
                              {Array.isArray(contact.tags) && contact.tags.length > 2 && (
                                <Badge variant="outline" className="bg-neutral-100 text-neutral-700">
                                  +{contact.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(contact.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Abrir menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  <span>Iniciar conversa</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Editar contato</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Excluir contato</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserPlus className="h-12 w-12 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-1">
                      {searchQuery ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
                    </h3>
                    <p className="text-neutral-500 mb-6 max-w-md">
                      {searchQuery 
                        ? `Não encontramos nenhum contato que corresponda a "${searchQuery}". Tente outro termo ou limpe a busca.` 
                        : "Você ainda não possui contatos cadastrados. Adicione seu primeiro contato para começar."}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <PlusCircle size={16} />
                        <span>Adicionar Contato</span>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default ContactsPage;