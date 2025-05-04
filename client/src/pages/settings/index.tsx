import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  MessagesSquare,
  PlusCircle, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2, 
  Power, 
  Facebook, 
  Instagram, 
  Phone,
  MessageCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("message-templates");
  
  // Estados para formulários de respostas rápidas
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    content: "",
    category: "general"
  });
  
  // Estados para formulários de canais
  const [isNewChannelDialogOpen, setIsNewChannelDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [channelForm, setChannelForm] = useState({
    name: "",
    type: "whatsapp",
    config: {}
  });
  
  // Consultas para buscar dados
  const messageTemplatesQuery = useQuery({
    queryKey: ['/api/message-templates'],
    queryFn: () => apiRequest('/api/message-templates')
  });
  
  const channelsQuery = useQuery({
    queryKey: ['/api/channels'],
    queryFn: () => apiRequest('/api/channels')
  });
  
  // Manipuladores para respostas rápidas
  const handleNewTemplate = () => {
    setTemplateForm({
      title: "",
      content: "",
      category: "general"
    });
    setEditingTemplate(null);
    setIsNewTemplateDialogOpen(true);
  };
  
  const handleEditTemplate = (template: any) => {
    setTemplateForm({
      title: template.title,
      content: template.content,
      category: template.category || "general"
    });
    setEditingTemplate(template);
    setIsNewTemplateDialogOpen(true);
  };
  
  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        // Atualizar modelo existente
        await apiRequest(`/api/message-templates/${editingTemplate.id}`, {
          method: 'PATCH',
          body: JSON.stringify(templateForm)
        });
        toast({
          description: "Modelo de mensagem atualizado com sucesso",
          duration: 3000
        });
      } else {
        // Criar novo modelo
        await apiRequest('/api/message-templates', {
          method: 'POST',
          body: JSON.stringify(templateForm)
        });
        toast({
          description: "Modelo de mensagem criado com sucesso",
          duration: 3000
        });
      }
      
      setIsNewTemplateDialogOpen(false);
      messageTemplatesQuery.refetch();
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar modelo de mensagem",
        duration: 5000
      });
    }
  };
  
  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;
    
    try {
      await apiRequest(`/api/message-templates/${id}`, {
        method: 'DELETE'
      });
      
      toast({
        description: "Modelo de mensagem excluído com sucesso",
        duration: 3000
      });
      
      messageTemplatesQuery.refetch();
    } catch (error) {
      console.error("Erro ao excluir modelo:", error);
      toast({
        variant: "destructive",
        description: "Erro ao excluir modelo de mensagem",
        duration: 5000
      });
    }
  };
  
  // Manipuladores para canais
  const handleNewChannel = () => {
    setChannelForm({
      name: "",
      type: "whatsapp",
      config: {}
    });
    setEditingChannel(null);
    setIsNewChannelDialogOpen(true);
  };
  
  const handleEditChannel = (channel: any) => {
    setChannelForm({
      name: channel.name,
      type: channel.type,
      config: channel.config || {}
    });
    setEditingChannel(channel);
    setIsNewChannelDialogOpen(true);
  };
  
  const handleChannelFormChange = (field: string, value: any) => {
    if (field.startsWith("config.")) {
      const configField = field.replace("config.", "");
      setChannelForm(prev => ({
        ...prev,
        config: {
          ...prev.config,
          [configField]: value
        }
      }));
    } else {
      setChannelForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  const handleSaveChannel = async () => {
    try {
      if (editingChannel) {
        // Atualizar canal existente
        await apiRequest(`/api/channels/${editingChannel.id}`, {
          method: 'PATCH',
          body: JSON.stringify(channelForm)
        });
        toast({
          description: "Canal atualizado com sucesso",
          duration: 3000
        });
      } else {
        // Criar novo canal
        await apiRequest('/api/channels', {
          method: 'POST',
          body: JSON.stringify(channelForm)
        });
        toast({
          description: "Canal criado com sucesso",
          duration: 3000
        });
      }
      
      setIsNewChannelDialogOpen(false);
      channelsQuery.refetch();
    } catch (error) {
      console.error("Erro ao salvar canal:", error);
      toast({
        variant: "destructive",
        description: "Erro ao salvar canal de comunicação",
        duration: 5000
      });
    }
  };
  
  const handleToggleChannelStatus = async (id: number, isActive: boolean) => {
    try {
      await apiRequest(`/api/channels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive })
      });
      
      toast({
        description: `Canal ${isActive ? "desativado" : "ativado"} com sucesso`,
        duration: 3000
      });
      
      channelsQuery.refetch();
    } catch (error) {
      console.error("Erro ao atualizar status do canal:", error);
      toast({
        variant: "destructive",
        description: "Erro ao atualizar status do canal",
        duration: 5000
      });
    }
  };
  
  const handleDeleteChannel = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este canal?")) return;
    
    try {
      await apiRequest(`/api/channels/${id}`, {
        method: 'DELETE'
      });
      
      toast({
        description: "Canal excluído com sucesso",
        duration: 3000
      });
      
      channelsQuery.refetch();
    } catch (error) {
      console.error("Erro ao excluir canal:", error);
      toast({
        variant: "destructive",
        description: "Erro ao excluir canal",
        duration: 5000
      });
    }
  };
  
  // Função para renderizar ícone de canal
  const getChannelIcon = (type: string) => {
    switch (type) {
      case "whatsapp":
        return <MessageCircle className="w-5 h-5 text-green-600" />;
      case "facebook":
        return <Facebook className="w-5 h-5 text-blue-600" />;
      case "instagram":
        return <Instagram className="w-5 h-5 text-pink-600" />;
      case "sms":
        return <Phone className="w-5 h-5 text-gray-600" />;
      default:
        return <MessagesSquare className="w-5 h-5 text-gray-600" />;
    }
  };
  
  // Função para render campos dinâmicos do formulário de canal
  const renderChannelConfigFields = () => {
    const channelType = channelForm.type;
    
    switch (channelType) {
      case "whatsapp":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Select 
                value={channelForm.config.provider || "twilio"} 
                onValueChange={(value) => handleChannelFormChange("config.provider", value)}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="zap">Zap (QR Code)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {channelForm.config.provider === "twilio" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Número de Telefone</Label>
                  <Input 
                    id="phoneNumber" 
                    value={channelForm.config.phoneNumber || ""} 
                    onChange={(e) => handleChannelFormChange("config.phoneNumber", e.target.value)}
                    placeholder="+5511987654321"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountSid">Twilio Account SID</Label>
                  <Input 
                    id="accountSid" 
                    value={channelForm.config.accountSid || ""} 
                    onChange={(e) => handleChannelFormChange("config.accountSid", e.target.value)}
                    placeholder="AC123456..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authToken">Twilio Auth Token</Label>
                  <Input 
                    id="authToken" 
                    type="password"
                    value={channelForm.config.authToken || ""} 
                    onChange={(e) => handleChannelFormChange("config.authToken", e.target.value)}
                    placeholder="******"
                  />
                </div>
              </>
            ) : (
              <div className="py-4 text-center text-gray-500">
                A configuração para Zap (QR Code) será exibida após a criação do canal.
              </div>
            )}
          </>
        );
      
      case "facebook":
      case "instagram":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Token de Acesso Meta</Label>
              <Input 
                id="accessToken" 
                type="password"
                value={channelForm.config.accessToken || ""} 
                onChange={(e) => handleChannelFormChange("config.accessToken", e.target.value)}
                placeholder="EAA..."
              />
            </div>
            {channelType === "facebook" ? (
              <div className="space-y-2">
                <Label htmlFor="pageId">ID da Página</Label>
                <Input 
                  id="pageId" 
                  value={channelForm.config.pageId || ""} 
                  onChange={(e) => handleChannelFormChange("config.pageId", e.target.value)}
                  placeholder="12345678901"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="instagramAccountId">ID da Conta Instagram</Label>
                <Input 
                  id="instagramAccountId" 
                  value={channelForm.config.instagramAccountId || ""} 
                  onChange={(e) => handleChannelFormChange("config.instagramAccountId", e.target.value)}
                  placeholder="12345678901"
                />
              </div>
            )}
          </>
        );
      
      case "sms":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="smsProvider">Provedor SMS</Label>
              <Select 
                value={channelForm.config.smsProvider || "twilio"} 
                onValueChange={(value) => handleChannelFormChange("config.smsProvider", value)}
              >
                <SelectTrigger id="smsProvider">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="sinch">Sinch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave API</Label>
              <Input 
                id="apiKey" 
                type="password"
                value={channelForm.config.apiKey || ""} 
                onChange={(e) => handleChannelFormChange("config.apiKey", e.target.value)}
                placeholder="******"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderNumber">Número de Envio</Label>
              <Input 
                id="senderNumber" 
                value={channelForm.config.senderNumber || ""} 
                onChange={(e) => handleChannelFormChange("config.senderNumber", e.target.value)}
                placeholder="+5511987654321"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="flex h-screen bg-neutral-50">
      <Helmet>
        <title>Configurações | OmniConnect</title>
      </Helmet>
      
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
            <p className="text-neutral-500">Gerencie as configurações do sistema e preferências de comunicação</p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="message-templates">Respostas Rápidas</TabsTrigger>
              <TabsTrigger value="channels">Canais de Comunicação</TabsTrigger>
              <TabsTrigger value="ai-settings">Configurações de IA</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
            </TabsList>
            
            {/* Tab de Respostas Rápidas */}
            <TabsContent value="message-templates">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Modelos de Respostas Rápidas</CardTitle>
                    <CardDescription>
                      Gerencie modelos de mensagens para envio rápido em conversas
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewTemplate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Resposta
                  </Button>
                </CardHeader>
                <CardContent>
                  {messageTemplatesQuery.isLoading ? (
                    <div className="py-8 text-center">Carregando modelos...</div>
                  ) : messageTemplatesQuery.data && messageTemplatesQuery.data.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Conteúdo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {messageTemplatesQuery.data.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.title}</TableCell>
                            <TableCell className="max-w-md truncate">{template.content}</TableCell>
                            <TableCell className="capitalize">{template.category || "Geral"}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-neutral-500">
                      Nenhum modelo de resposta rápida encontrado. Clique em "Nova Resposta" para criar.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Modal de Nova/Editar Resposta Rápida */}
              <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? "Editar Resposta Rápida" : "Nova Resposta Rápida"}
                    </DialogTitle>
                    <DialogDescription>
                      Crie ou edite um modelo de mensagem para uso rápido nas conversas.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={templateForm.title}
                        onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                        placeholder="Ex: Saudação inicial"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select 
                        value={templateForm.category} 
                        onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Geral</SelectItem>
                          <SelectItem value="greetings">Saudações</SelectItem>
                          <SelectItem value="support">Suporte</SelectItem>
                          <SelectItem value="sales">Vendas</SelectItem>
                          <SelectItem value="closing">Encerramento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="content">Conteúdo da Mensagem</Label>
                      <Textarea
                        id="content"
                        rows={5}
                        value={templateForm.content}
                        onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                        placeholder="Digite o conteúdo da mensagem aqui..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleSaveTemplate}>
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            {/* Tab de Canais de Comunicação */}
            <TabsContent value="channels">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Canais de Comunicação</CardTitle>
                    <CardDescription>
                      Configure e gerencie os canais de comunicação como WhatsApp, Facebook e Instagram
                    </CardDescription>
                  </div>
                  <Button onClick={handleNewChannel}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Canal
                  </Button>
                </CardHeader>
                <CardContent>
                  {channelsQuery.isLoading ? (
                    <div className="py-8 text-center">Carregando canais...</div>
                  ) : channelsQuery.data && channelsQuery.data.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Canal</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {channelsQuery.data.map((channel) => (
                          <TableRow key={channel.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                {getChannelIcon(channel.type)}
                                <span className="ml-2">{channel.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{channel.type}</TableCell>
                            <TableCell>
                              <div className={`px-2 py-1 rounded text-xs font-medium inline-block ${channel.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {channel.isActive ? 'Ativo' : 'Inativo'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEditChannel(channel)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleChannelStatus(channel.id, channel.isActive)}>
                                    <Power className="mr-2 h-4 w-4" />
                                    {channel.isActive ? 'Desativar' : 'Ativar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteChannel(channel.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-neutral-500">
                      Nenhum canal de comunicação encontrado. Clique em "Novo Canal" para criar.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Modal de Novo/Editar Canal */}
              <Dialog open={isNewChannelDialogOpen} onOpenChange={setIsNewChannelDialogOpen}>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingChannel ? "Editar Canal" : "Novo Canal de Comunicação"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure um canal para comunicação com seus contatos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome do Canal</Label>
                      <Input
                        id="name"
                        value={channelForm.name}
                        onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                        placeholder="Ex: WhatsApp Comercial"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Tipo de Canal</Label>
                      <Select 
                        value={channelForm.type} 
                        onValueChange={(value) => setChannelForm({ 
                          ...channelForm, 
                          type: value,
                          config: {} // Reset config when changing channel type
                        })}
                        disabled={!!editingChannel} // Não permitir alterar o tipo se estiver editando
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Selecione o tipo de canal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Campos dinâmicos baseados no tipo de canal */}
                    {renderChannelConfigFields()}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsNewChannelDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleSaveChannel}>
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            {/* Tab de Configurações de IA */}
            <TabsContent value="ai-settings">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações do Assistente IA</CardTitle>
                  <CardDescription>
                    Configure as opções de inteligência artificial do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="openai-key">Chave API OpenAI</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="openai-key"
                          type="password"
                          placeholder="sk-..."
                          value="••••••••••••••••••••••••••••••••"
                          readOnly
                        />
                        <Button variant="outline">Atualizar</Button>
                      </div>
                      <p className="text-sm text-neutral-500">
                        A chave API da OpenAI é usada para fornecer recursos de IA como respostas sugeridas e análise de sentimento.
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-4">
                      <Label htmlFor="ai-model">Modelo de IA</Label>
                      <Select defaultValue="gpt-4o">
                        <SelectTrigger id="ai-model">
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-neutral-500">
                        O modelo GPT-4o oferece melhor qualidade de resposta, enquanto o GPT-3.5 Turbo é mais rápido e econômico.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">Cancelar</Button>
                  <Button>Salvar configurações</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Tab de Notificações */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências de Notificação</CardTitle>
                  <CardDescription>
                    Configure como e quando deseja receber notificações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-notifications">Email</Label>
                        <Select defaultValue="important">
                          <SelectTrigger id="email-notifications">
                            <SelectValue placeholder="Selecione quando receber emails" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as mensagens</SelectItem>
                            <SelectItem value="important">Apenas importantes</SelectItem>
                            <SelectItem value="none">Nenhum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="push-notifications">Notificações Push</Label>
                        <Select defaultValue="all">
                          <SelectTrigger id="push-notifications">
                            <SelectValue placeholder="Selecione quando receber notificações push" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as mensagens</SelectItem>
                            <SelectItem value="important">Apenas importantes</SelectItem>
                            <SelectItem value="none">Nenhum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-4">
                      <Label htmlFor="notify-email">Email para notificações</Label>
                      <Input
                        id="notify-email"
                        type="email"
                        placeholder="seu@email.com"
                        defaultValue={user?.email}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">Cancelar</Button>
                  <Button>Salvar preferências</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;