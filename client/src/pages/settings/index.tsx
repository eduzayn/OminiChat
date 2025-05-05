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
import { Separator } from "@/components/ui/separator";

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
  ChevronLeft,
  Search,
  AlertCircle,
  QrCode,
  Smartphone,
  Check,
  X,
  Settings2,
  RefreshCw,
  Send,
  MessageSquare,
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
  
  // Estado para controlar o fluxo de criação de canal em etapas
  const [channelSetupStep, setChannelSetupStep] = useState<"select-type" | "configure" | "preview">("select-type");
  const [selectedChannelType, setSelectedChannelType] = useState<string>("");
  
  // Estados para o QR Code do WhatsApp
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [selectedWhatsAppChannel, setSelectedWhatsAppChannel] = useState<any>(null);
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  
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
    setSelectedChannelType("");
    setChannelSetupStep("select-type");
    setEditingChannel(null);
    setIsNewChannelDialogOpen(true);
  };
  
  const handleEditChannel = (channel: any) => {
    setChannelForm({
      name: channel.name,
      type: channel.type,
      config: channel.config || {}
    });
    setSelectedChannelType(channel.type);
    setChannelSetupStep("configure");
    setEditingChannel(channel);
    setIsNewChannelDialogOpen(true);
  };
  
  const handleSelectChannelType = (type: string) => {
    setSelectedChannelType(type);
    setChannelForm(prev => ({
      ...prev,
      type,
      name: prev.name || getDefaultChannelName(type)
    }));
    setChannelSetupStep("configure");
  };
  
  const getDefaultChannelName = (type: string) => {
    switch (type) {
      case "whatsapp": return "WhatsApp Atendimento";
      case "facebook": return "Facebook Messenger";
      case "instagram": return "Instagram Direct";
      case "sms": return "SMS Marketing";
      case "email": return "Email Suporte";
      case "web": return "Chat do Site";
      default: return "Novo Canal";
    }
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
  
  // Função para buscar QR Code do WhatsApp
  const handleGetWhatsAppQrCode = async (channelId: number) => {
    setQrCodeLoading(true);
    setQrCodeData("");
    
    try {
      const response = await fetch(`/api/channels/${channelId}/qrcode`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.qrCode) {
        setQrCodeData(data.qrCode);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao obter QR Code",
          description: data.message || "Não foi possível obter o QR Code para este canal",
          duration: 5000
        });
      }
    } catch (error) {
      console.error("Erro ao buscar QR Code:", error);
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor para obter o QR Code",
        duration: 5000
      });
    } finally {
      setQrCodeLoading(false);
    }
  };

  // Função para abrir o modal de QR Code
  const handleOpenQrCodeDialog = (channel: any) => {
    setSelectedWhatsAppChannel(channel);
    setQrCodeData("");
    setQrCodeLoading(false);
    handleGetWhatsAppQrCode(channel.id);
    setQrCodeDialogOpen(true);
  };

  const handleSaveChannel = async () => {
    try {
      let savedChannel;
      
      if (editingChannel) {
        // Atualizar canal existente
        const response = await fetch(`/api/channels/${editingChannel.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(channelForm)
        });
        
        savedChannel = await response.json();
        
        toast({
          description: "Canal atualizado com sucesso",
          duration: 3000
        });
      } else {
        // Criar novo canal
        const response = await fetch('/api/channels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(channelForm)
        });
        
        savedChannel = await response.json();
        
        toast({
          description: "Canal criado com sucesso",
          duration: 3000
        });
      }
      
      setIsNewChannelDialogOpen(false);
      
      // Verificar se é um canal WhatsApp via QR Code (zapi) e exibir QR Code
      if (savedChannel && 
          channelForm.type === "whatsapp" && 
          channelForm.config.provider === "zapi") {
        handleOpenQrCodeDialog(savedChannel);
      }
      
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
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
        );
      case "facebook":
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
            <Facebook className="w-5 h-5 text-blue-600" />
          </div>
        );
      case "instagram":
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-pink-100 rounded-full">
            <Instagram className="w-5 h-5 text-pink-600" />
          </div>
        );
      case "sms":
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
            <Phone className="w-5 h-5 text-purple-600" />
          </div>
        );
      case "email":
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
            <Mail className="w-5 h-5 text-yellow-600" />
          </div>
        );
      case "web":
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <Globe className="w-5 h-5 text-gray-600" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <MessagesSquare className="w-5 h-5 text-gray-600" />
          </div>
        );
    }
  };
  
  // Função para render campos dinâmicos do formulário de canal
  const renderChannelConfigFields = () => {
    const channelType = channelForm.type;
    
    switch (channelType) {
      case "whatsapp":
        // Não exibimos o seletor de provedor, pois já foi escolhido nas opções visuais
        if (channelForm.config.provider === "meta") {
          return (
            <>
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">ID do Número de Telefone</Label>
                <Input 
                  id="phoneNumberId" 
                  value={channelForm.config.phoneNumberId || ""} 
                  onChange={(e) => handleChannelFormChange("config.phoneNumberId", e.target.value)}
                  placeholder="12345678901"
                />
                <p className="text-xs text-muted-foreground">
                  ID obtido no painel do WhatsApp Business na Meta.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAccountId">ID da Conta Business</Label>
                <Input 
                  id="businessAccountId" 
                  value={channelForm.config.businessAccountId || ""} 
                  onChange={(e) => handleChannelFormChange("config.businessAccountId", e.target.value)}
                  placeholder="12345678901"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken">Token de Acesso</Label>
                <Input 
                  id="accessToken" 
                  type="password"
                  value={channelForm.config.accessToken || ""} 
                  onChange={(e) => handleChannelFormChange("config.accessToken", e.target.value)}
                  placeholder="EAA..."
                />
                <p className="text-xs text-muted-foreground">
                  Token de acesso gerado no Facebook/Meta Business Suite.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wabaId">ID da WABA (Opcional)</Label>
                <Input 
                  id="wabaId" 
                  value={channelForm.config.wabaId || ""} 
                  onChange={(e) => handleChannelFormChange("config.wabaId", e.target.value)}
                  placeholder="12345678901"
                />
                <p className="text-xs text-muted-foreground">
                  ID da WhatsApp Business Account, caso possua uma.
                </p>
              </div>
            </>
          );
        } else if (channelForm.config.provider === "zapi") {
          return (
            <>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Z-API: Integração Robusta com WhatsApp</h4>
                    <p className="text-sm text-blue-700">
                      A Z-API oferece recursos avançados como suporte a múltiplos formatos de mídia, QR Code, obtenção de conversas e mensagens anteriores.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instanceId">ID da Instância Z-API</Label>
                <Input 
                  id="instanceId" 
                  value={channelForm.config.instanceId || ""} 
                  onChange={(e) => handleChannelFormChange("config.instanceId", e.target.value)}
                  placeholder="Ex: 1A2B3C4D5E6F7G8H9I0J"
                />
                <p className="text-xs text-muted-foreground">
                  ID da sua instância na Z-API (encontrado no painel da Z-API)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="token">Token Z-API</Label>
                <Input 
                  id="token" 
                  type="password"
                  value={channelForm.config.token || ""} 
                  onChange={(e) => handleChannelFormChange("config.token", e.target.value)}
                  placeholder="Token da sua instância Z-API"
                />
                <p className="text-xs text-muted-foreground">
                  Token de autorização da sua instância na Z-API
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone (opcional)</Label>
                <Input 
                  id="phone" 
                  value={channelForm.config.phone || ""} 
                  onChange={(e) => handleChannelFormChange("config.phone", e.target.value)}
                  placeholder="+5511999999999"
                />
                <p className="text-xs text-muted-foreground">
                  Número de telefone no formato internacional (Ex: +5511999999999)
                </p>
              </div>
            </>
          );
        } else if (channelForm.config.provider === "twilio") {
          return (
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
          );
        } else if (channelForm.config.provider === "zapi") {
          // Implementação para exibição do QR Code
          return (
            <>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">WhatsApp via QR Code</h4>
                    <p className="text-sm text-blue-700">
                      Após salvar este canal, você poderá escanear o QR Code para conectar seu WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsappName">Nome do WhatsApp</Label>
                <Input 
                  id="whatsappName" 
                  value={channelForm.name || ""} 
                  onChange={(e) => handleChannelFormChange("name", e.target.value)}
                  placeholder="Ex: WhatsApp Atendimento"
                />
                <p className="text-xs text-muted-foreground">
                  Nome para identificação deste canal WhatsApp
                </p>
              </div>
            </>
          );
        } else {
          return (
            <div className="py-4 text-center text-gray-500">
              Selecione um provedor de WhatsApp para configurar este canal.
            </div>
          );
        }
      
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
                    <div className="flex gap-2">
                      <div className="relative w-60">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Pesquisar canais..."
                          className="pl-8"
                        />
                      </div>
                      <Button onClick={handleNewChannel}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Canal
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {channelsQuery.isLoading ? (
                      <div className="py-8 text-center">Carregando canais...</div>
                    ) : channelsQuery.data && channelsQuery.data.length > 0 ? (
                      <div className="rounded-md border">
                        <div className="grid gap-4">
                          {channelsQuery.data.map((channel) => (
                            <div key={channel.id} className="flex items-center justify-between border-b p-4 last:border-0">
                              <div className="flex items-center gap-4">
                                {getChannelIcon(channel.type)}
                                <div>
                                  <div className="font-medium">{channel.name}</div>
                                  <div className="text-sm text-muted-foreground capitalize">
                                    {channel.type === "facebook" ? "Página do Facebook" : 
                                     channel.type === "instagram" ? "Instagram Direct" : 
                                     channel.type === "whatsapp" ? channel.config && channel.config.phoneNumber || "WhatsApp" :
                                     channel.type === "email" ? "E-mail" : 
                                     channel.type === "sms" ? "SMS" : 
                                     "Canal Web"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Status indicator */}
                                {channel.isActive ? (
                                  <div className="flex items-center">
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                                      <Check className="mr-1 h-3 w-3" /> Ativo
                                    </Badge>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0">
                                      <AlertCircle className="mr-1 h-3 w-3" /> Necessário Reiniciar Canal
                                    </Badge>
                                  </div>
                                )}
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
                                    
                                    {/* QR Code para WhatsApp */}
                                    {channel.type === "whatsapp" && 
                                     channel.config && 
                                     channel.config.provider === "zap" && (
                                      <DropdownMenuItem onClick={() => handleOpenQrCodeDialog(channel)}>
                                        <QrCode className="mr-2 h-4 w-4" />
                                        <span>Escanear QR Code</span>
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {!channel.isActive && (
                                      <DropdownMenuItem 
                                        onClick={() => handleToggleChannelStatus(channel.id, channel.isActive)}
                                      >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        <span>Reiniciar Canal</span>
                                      </DropdownMenuItem>
                                    )}
                                    {channel.isActive && (
                                      <DropdownMenuItem 
                                        onClick={() => handleToggleChannelStatus(channel.id, channel.isActive)}
                                      >
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        <span>Desativar</span>
                                      </DropdownMenuItem>
                                    )}
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
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
        <DialogContent className={`${channelSetupStep === "select-type" ? "sm:max-w-[750px]" : "sm:max-w-[600px]"}`}>
          <DialogHeader className="flex flex-row items-center">
            {channelSetupStep !== "select-type" && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="mr-2 h-8 w-8" 
                onClick={() => setChannelSetupStep("select-type")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {editingChannel 
                  ? "Editar Canal" 
                  : channelSetupStep === "select-type" 
                    ? "Conectar novo canal" 
                    : `Conectar canal de ${
                        selectedChannelType === "whatsapp" ? "WhatsApp" : 
                        selectedChannelType === "facebook" ? "Facebook" : 
                        selectedChannelType === "instagram" ? "Instagram" : 
                        selectedChannelType === "email" ? "E-mail" : 
                        selectedChannelType === "sms" ? "SMS" : 
                        "Web"
                      }`
                }
              </DialogTitle>
              <DialogDescription>
                {channelSetupStep === "select-type" 
                  ? "Escolha um canal de comunicação para integrar ao OmniConnect" 
                  : `Configure os detalhes do canal de ${
                      selectedChannelType === "whatsapp" ? "WhatsApp" : 
                      selectedChannelType === "facebook" ? "Facebook" : 
                      selectedChannelType === "instagram" ? "Instagram" : 
                      selectedChannelType === "email" ? "E-mail" : 
                      selectedChannelType === "sms" ? "SMS" : 
                      "Web"
                    }`
                }
              </DialogDescription>
            </div>
          </DialogHeader>

          {channelSetupStep === "select-type" ? (
            <div className="grid grid-cols-3 gap-5 py-6">
              <div 
                className="flex flex-col items-center justify-center p-8 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => handleSelectChannelType("whatsapp")}
              >
                <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                  <MessageCircle className="w-7 h-7 text-green-600" />
                </div>
                <span className="text-base font-medium">WhatsApp</span>
                <span className="text-xs text-muted-foreground mt-1">WhatsApp Business</span>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-8 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => handleSelectChannelType("facebook")}
              >
                <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
                  <Facebook className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-base font-medium">Facebook</span>
                <span className="text-xs text-muted-foreground mt-1">Messenger</span>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-8 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => handleSelectChannelType("instagram")}
              >
                <div className="flex items-center justify-center w-14 h-14 bg-pink-100 rounded-full mb-4">
                  <Instagram className="w-7 h-7 text-pink-600" />
                </div>
                <span className="text-base font-medium">Instagram</span>
                <span className="text-xs text-muted-foreground mt-1">Direct Messages</span>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-8 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => handleSelectChannelType("email")}
              >
                <div className="flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mb-4">
                  <Mail className="w-7 h-7 text-yellow-600" />
                </div>
                <span className="text-base font-medium">E-mail</span>
                <span className="text-xs text-muted-foreground mt-1">Comunicação via email</span>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-8 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => handleSelectChannelType("sms")}
              >
                <div className="flex items-center justify-center w-14 h-14 bg-purple-100 rounded-full mb-4">
                  <Phone className="w-7 h-7 text-purple-600" />
                </div>
                <span className="text-base font-medium">SMS</span>
                <span className="text-xs text-muted-foreground mt-1">Mensagens de texto</span>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-8 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => handleSelectChannelType("web")}
              >
                <div className="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
                  <Globe className="w-7 h-7 text-gray-600" />
                </div>
                <span className="text-base font-medium">Web Chat</span>
                <span className="text-xs text-muted-foreground mt-1">Chat para seu site</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Canal</Label>
                <Input 
                  id="name" 
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  placeholder={`Ex: ${getDefaultChannelName(selectedChannelType)}`}
                />
              </div>
              
              {selectedChannelType === "whatsapp" && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-green-800">Integração com API WhatsApp Business</h4>
                        <p className="text-sm text-green-700">
                          Você pode usar a integração direta com a API oficial do WhatsApp Business da Meta, sem necessidade de usar o Twilio como intermediário.
                        </p>
                      </div>
                    </div>
                  </div>
                
                  <div className="space-y-2">
                    <Label>Escolha o tipo de canal que deseja conectar</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-md border ${channelForm.config.provider === "meta" ? 'border-primary bg-primary/5' : 'border-gray-200'} hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors`}
                        onClick={() => handleChannelFormChange("config.provider", "meta")}
                      >
                        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2">
                          <Smartphone className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium">Meta API</span>
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-2 flex items-center">
                          <Check className="w-3 h-3 mr-1" /> Oficial
                        </div>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-md border ${channelForm.config.provider === "zapi" ? 'border-primary bg-primary/5' : 'border-gray-200'} hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors`}
                        onClick={() => handleChannelFormChange("config.provider", "zapi")}
                      >
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">Z-API</span>
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-2 flex items-center">
                          <Check className="w-3 h-3 mr-1" /> Recomendado
                        </div>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-md border ${channelForm.config.provider === "twilio" ? 'border-primary bg-primary/5' : 'border-gray-200'} hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors`}
                        onClick={() => handleChannelFormChange("config.provider", "twilio")}
                      >
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2">
                          <MessageCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium">Twilio</span>
                        <span className="text-xs text-muted-foreground mt-1">Integração via Twilio</span>
                      </div>
                      
                      <div 
                        className={`flex flex-col items-center justify-center p-4 rounded-md border ${channelForm.config.provider === "zap" ? 'border-primary bg-primary/5' : 'border-gray-200'} hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors`}
                        onClick={() => handleChannelFormChange("config.provider", "zap")}
                      >
                        <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full mb-2">
                          <QrCode className="w-5 h-5 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">WhatsApp App</span>
                        <span className="text-xs text-muted-foreground mt-1">(QR Code)</span>
                      </div>
                    </div>
                  </div>
                  
                  {renderChannelConfigFields()}
                </div>
              )}
              
              {(selectedChannelType === "facebook" || selectedChannelType === "instagram") && (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Facebook className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Integração direta Meta/Facebook</h4>
            <p className="text-sm text-blue-700">
              Esta integração utiliza a API oficial do Meta/Facebook diretamente, sem intermediários como o Twilio.
            </p>
          </div>
        </div>
      </div>
      {renderChannelConfigFields()}
    </div>
  )}
              {selectedChannelType === "sms" && renderChannelConfigFields()}
              
              {selectedChannelType === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Endereço de Email</Label>
                  <Input 
                    id="emailAddress" 
                    type="email"
                    value={channelForm.config.emailAddress || ""} 
                    onChange={(e) => handleChannelFormChange("config.emailAddress", e.target.value)}
                    placeholder="atendimento@seudominio.com"
                  />
                </div>
              )}
              
              {selectedChannelType === "web" && (
                <div className="space-y-2">
                  <Label htmlFor="webDomain">Domínio do Site</Label>
                  <Input 
                    id="webDomain" 
                    value={channelForm.config.webDomain || ""} 
                    onChange={(e) => handleChannelFormChange("config.webDomain", e.target.value)}
                    placeholder="www.seusite.com.br"
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewChannelDialogOpen(false)}>
              Cancelar
            </Button>
            {channelSetupStep !== "select-type" && (
              <Button type="submit" onClick={handleSaveChannel}>
                Salvar
              </Button>
            )}
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
      
      {/* Dialog para exibir QR Code do WhatsApp */}
      <Dialog open={qrCodeDialogOpen} onOpenChange={setQrCodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie este QR Code com seu WhatsApp para conectar-se ao sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            {qrCodeLoading ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-muted-foreground">Carregando QR Code...</p>
              </div>
            ) : qrCodeData ? (
              <div className="flex flex-col items-center gap-4">
                <div className="border rounded-md p-4 bg-white">
                  <img 
                    src={`data:image/png;base64,${qrCodeData}`} 
                    alt="QR Code para conectar WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="text-sm text-muted-foreground max-w-md text-center">
                  <p>1. Abra o WhatsApp no seu telefone</p>
                  <p>2. Toque em Menu ou Configurações e selecione WhatsApp Web</p>
                  <p>3. Aponte seu telefone para esta tela para capturar o código</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Não foi possível carregar o QR Code.</p>
                <Button 
                  variant="outline" 
                  onClick={() => selectedWhatsAppChannel && handleGetWhatsAppQrCode(selectedWhatsAppChannel.id)}
                  className="mt-4"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrCodeDialogOpen(false)}>
              Fechar
            </Button>
            {qrCodeData && (
              <Button onClick={() => selectedWhatsAppChannel && handleGetWhatsAppQrCode(selectedWhatsAppChannel.id)}>
                Atualizar QR Code
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SettingsPage;