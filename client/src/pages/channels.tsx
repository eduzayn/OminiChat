import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZapiConfig } from "@/components/zapi-config";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Channel } from "@shared/schema";
import { 
  AlertCircle, 
  Check, 
  MessageSquare, 
  Plus, 
  Trash, 
  RefreshCw,
  PhoneCall,
  Instagram,
  MailPlus
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

function ChannelsPage() {
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("whatsapp");
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const { toast } = useToast();

  // Query para buscar todos os canais
  const { data: channels, isLoading } = useQuery({
    queryKey: ['/api/channels'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/channels');
      return response as Channel[];
    }
  });

  // Mutation para criar um novo canal
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: { name: string, type: string }) => {
      return await apiRequest('POST', '/api/channels', channelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      toast({
        title: "Canal criado",
        description: `O canal ${newChannelName} foi criado com sucesso`,
      });
      setNewChannelName("");
      setIsAddingChannel(false);
    },
    onError: (error) => {
      console.error("Erro ao criar canal:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o canal",
      });
    }
  });

  // Mutation para remover um canal
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      return await apiRequest('DELETE', `/api/channels/${channelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      toast({
        title: "Canal removido",
        description: "O canal foi removido com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao remover canal:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o canal",
      });
    }
  });

  // Criar novo canal
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, informe um nome para o canal",
      });
      return;
    }

    await createChannelMutation.mutateAsync({
      name: newChannelName.trim(),
      type: newChannelType
    });
  };

  // Remover canal
  const handleDeleteChannel = async (channelId: number) => {
    if (confirm("Tem certeza que deseja remover este canal? Esta ação não pode ser desfeita.")) {
      await deleteChannelMutation.mutateAsync(channelId);
    }
  };

  // Filtrar canais por tipo
  const getChannelsByType = (type: string) => {
    return channels?.filter(channel => channel.type === type) || [];
  };

  // Obter ícone do canal por tipo
  const getChannelIcon = (type: string) => {
    switch (type) {
      case "whatsapp":
        return <MessageSquare className="h-8 w-8 text-green-500" />;
      case "facebook":
        return <PhoneCall className="h-8 w-8 text-blue-500" />;
      case "instagram":
        return <Instagram className="h-8 w-8 text-purple-500" />;
      case "email":
        return <MailPlus className="h-8 w-8 text-red-500" />;
      default:
        return <MessageSquare className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <AppShell>
      <Helmet>
        <title>Canais | OmniConnect</title>
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Canais de Comunicação</h1>
            <p className="text-muted-foreground">
              Gerencie seus canais de comunicação para atendimento omnichannel
            </p>
          </div>

          <Dialog open={isAddingChannel} onOpenChange={setIsAddingChannel}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Canal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Canal</DialogTitle>
                <DialogDescription>
                  Adicione um novo canal de comunicação para interagir com seus clientes.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="channel-name">Nome do Canal</Label>
                  <Input
                    id="channel-name"
                    placeholder="Ex: WhatsApp Principal"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="channel-type">Tipo de Canal</Label>
                  <select
                    id="channel-type"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={newChannelType}
                    onChange={(e) => setNewChannelType(e.target.value)}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingChannel(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateChannel}
                  disabled={createChannelMutation.isPending}
                >
                  {createChannelMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Criar Canal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="whatsapp">
          <TabsList className="mb-4">
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <Card className="col-span-full">
                  <CardContent className="flex items-center justify-center h-40">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-muted-foreground">Carregando canais...</span>
                  </CardContent>
                </Card>
              ) : getChannelsByType("whatsapp").length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center h-40">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium">Nenhum canal WhatsApp</h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Adicione um canal WhatsApp para começar a receber mensagens.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                getChannelsByType("whatsapp").map((channel) => (
                  <Card key={channel.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center">
                        <MessageSquare className="h-5 w-5 text-green-500 mr-2" />
                        <CardTitle className="text-lg">{channel.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteChannel(channel.id)}
                      >
                        <Trash className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mt-2 mb-4">
                        <div className={`h-2 w-2 rounded-full mr-2 ${channel.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-muted-foreground">
                          {channel.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <ZapiConfig channelId={channel.id} />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="facebook" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <PhoneCall className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="text-lg font-medium">Facebook Messenger</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    O canal para Facebook Messenger será implementado em breve.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="instagram" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <Instagram className="h-8 w-8 text-purple-500 mb-2" />
                  <h3 className="text-lg font-medium">Instagram Direct</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    O canal para Instagram Direct será implementado em breve.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <MailPlus className="h-8 w-8 text-red-500 mb-2" />
                  <h3 className="text-lg font-medium">Email</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    O canal para Email será implementado em breve.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default ChannelsPage;