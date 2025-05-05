import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { Sidebar } from "@/components/sidebar";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  PlusCircle,
  Edit,
  Trash,
  MoreVertical,
  MessageCircle,
  MessagesSquare,
  Facebook,
  Instagram,
  Phone,
  Mail,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addListener } = useSocket();
  const [activeTab, setActiveTab] = useState("message-templates");
  const [openaiKey, setOpenaiKey] = useState("");
  const [isOpenaiDialogOpen, setIsOpenaiDialogOpen] = useState(false);
  
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
    queryFn: async () => {
      const response = await apiRequest('/api/message-templates');
      return response || [];
    }
  });
  
  const channelsQuery = useQuery({
    queryKey: ['/api/channels'],
    queryFn: async () => {
      const response = await apiRequest('/api/channels');
      return response || [];
    }
  });
  
  // Conectar-se aos eventos de WebSocket para atualizações de canais em tempo real
  useEffect(() => {
    // Manipulador para novos canais
    const removeChannelCreatedListener = addListener('channel_created', (data) => {
      console.log("Novo canal criado via WebSocket:", data);
      channelsQuery.refetch();
    });
    
    // Manipulador para canais atualizados
    const removeChannelUpdatedListener = addListener('channel_updated', (data) => {
      console.log("Canal atualizado via WebSocket:", data);
      channelsQuery.refetch();
    });
    
    // Manipulador para canais excluídos
    const removeChannelDeletedListener = addListener('channel_deleted', (data) => {
      console.log("Canal excluído via WebSocket:", data);
      channelsQuery.refetch();
    });
    
    // Limpar listeners quando o componente for desmontado
    return () => {
      removeChannelCreatedListener();
      removeChannelUpdatedListener();
      removeChannelDeletedListener();
    };
  }, [addListener, channelsQuery]);
  
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
        await fetch(`/api/message-templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateForm)
        });
        toast({
          description: "Modelo de mensagem atualizado com sucesso",
          duration: 3000
        });
      } else {
        // Criar novo modelo
        await fetch('/api/message-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
      await fetch(`/api/message-templates/${id}`, {
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
        await fetch(`/api/channels/${editingChannel.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(channelForm)
        });
        toast({
          description: "Canal atualizado com sucesso",
          duration: 3000
        });
      } else {
        // Criar novo canal
        await fetch('/api/channels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
      await fetch(`/api/channels/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
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
      await fetch(`/api/channels/${id}`, {
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
              <Label htmlFor="smsProvider">Provedor de SMS</Label>
              <Select 
                value={channelForm.config.smsProvider || "twilio"} 
                onValueChange={(value) => handleChannelFormChange("config.smsProvider", value)}
              >
                <SelectTrigger id="smsProvider">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="zenvia">Zenvia</SelectItem>
                  <SelectItem value="infobip">Infobip</SelectItem>
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
    <>
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
                                    <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Editar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)}>
                                      <Trash className="mr-2 h-4 w-4" />
                                      <span>Excluir</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Nenhum modelo de resposta encontrado. Clique em "Nova Resposta" para criar.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Tab de Canais de Comunicação */}
              <TabsContent value="channels">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Canais de Comunicação</CardTitle>
                      <CardDescription>
                        Gerencie os canais de comunicação com seus clientes
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
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {channelsQuery.data.map((channel) => (
                            <TableRow key={channel.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {getChannelIcon(channel.type)}
                                  <span>{channel.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">{channel.type}</TableCell>
                              <TableCell>
                                <Badge variant={channel.isActive ? "success" : "secondary"}>
                                  {channel.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menu</span>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditChannel(channel)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      <span>Editar</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleToggleChannelStatus(channel.id, channel.isActive)}
                                    >
                                      {channel.isActive ? (
                                        <>
                                          <EyeOff className="mr-2 h-4 w-4" />
                                          <span>Desativar</span>
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="mr-2 h-4 w-4" />
                                          <span>Ativar</span>
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteChannel(channel.id)}
                                      className="text-red-600"
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      <span>Excluir</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        Nenhum canal configurado. Clique em "Novo Canal" para adicionar.
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                          <Button variant="outline" onClick={() => setIsOpenaiDialogOpen(true)}>Atualizar</Button>
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
      
      {/* Dialog para criar/editar modelo de resposta */}
      <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Resposta Rápida" : "Nova Resposta Rápida"}</DialogTitle>
            <DialogDescription>
              Crie modelos de mensagens para uso rápido durante atendimentos
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                placeholder="Ex: Saudação inicial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={templateForm.category} 
                onValueChange={(value) => setTemplateForm({ ...templateForm, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="greeting">Saudações</SelectItem>
                  <SelectItem value="farewell">Despedidas</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="sales">Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea 
                id="content" 
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                rows={5}
                placeholder="Digite o texto do modelo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTemplateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSaveTemplate}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para criar/editar canal */}
      <Dialog open={isNewChannelDialogOpen} onOpenChange={setIsNewChannelDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingChannel ? "Editar Canal" : "Novo Canal"}</DialogTitle>
            <DialogDescription>
              Configure os detalhes do canal de comunicação
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Canal</Label>
              <Input 
                id="name" 
                value={channelForm.name}
                onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                placeholder="Ex: WhatsApp Suporte"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Canal</Label>
              <Select 
                value={channelForm.type} 
                onValueChange={(value) => setChannelForm({ ...channelForm, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook Messenger</SelectItem>
                  <SelectItem value="instagram">Instagram Direct</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="web">Web Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Campos específicos para cada tipo de canal */}
            {renderChannelConfigFields()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewChannelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSaveChannel}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para atualizar chave da API OpenAI */}
      <Dialog open={isOpenaiDialogOpen} onOpenChange={setIsOpenaiDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atualizar Chave da API OpenAI</DialogTitle>
            <DialogDescription>
              Forneça sua chave da API OpenAI para habilitar funcionalidades de IA.
              Você pode obter uma em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="openai-api-key" className="text-right">
                Chave API OpenAI
              </Label>
              <Input
                id="openai-api-key"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Sua chave é armazenada com segurança e nunca compartilhada.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenaiDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" onClick={async () => {
              if (!openaiKey.startsWith('sk-')) {
                toast({
                  variant: "destructive",
                  title: "Formato inválido",
                  description: "A chave API da OpenAI deve começar com 'sk-'",
                });
                return;
              }
              
              try {
                await fetch('/api/ai/settings', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ apiKey: openaiKey })
                });
                
                toast({
                  description: "Chave API atualizada com sucesso",
                  duration: 3000
                });
                
                setIsOpenaiDialogOpen(false);
                setOpenaiKey("");
              } catch (error) {
                console.error("Erro ao atualizar chave API:", error);
                toast({
                  variant: "destructive",
                  description: "Erro ao atualizar chave API",
                  duration: 5000
                });
              }
            }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SettingsPage;