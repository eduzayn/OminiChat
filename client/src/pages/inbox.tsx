import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { useConversation } from "@/context/conversation-context";
import { ZapiConfig } from "@/components/zapi-config";
import { apiRequest } from "@/lib/queryClient";
import { Channel } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AlertCircle, MessageSquare } from "lucide-react";

function InboxPage() {
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const { conversations } = useConversation();

  // Query para buscar todos os canais
  const { data: channels, isLoading: isLoadingChannels } = useQuery({
    queryKey: ['/api/channels'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/channels');
      return response as Channel[];
    }
  });

  // Selecionar primeiro canal WhatsApp automaticamente
  useEffect(() => {
    if (channels?.length && !selectedChannel) {
      const whatsappChannel = channels.find(channel => channel.type === 'whatsapp');
      if (whatsappChannel) {
        setSelectedChannel(whatsappChannel.id);
      }
    }
  }, [channels, selectedChannel]);

  // Filtrar canais por tipo
  const getChannelsByType = (type: string) => {
    return channels?.filter(channel => channel.type === type) || [];
  };

  // Verificar se há canais WhatsApp ativos
  const hasActiveWhatsAppChannels = () => {
    return getChannelsByType("whatsapp").some(channel => channel.isActive);
  };

  return (
    <AppShell>
      <Helmet>
        <title>Caixa de Entrada | OmniConnect</title>
      </Helmet>

      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-none border-b border-border p-4">
          <h1 className="text-2xl font-bold">Caixa de Entrada</h1>
          <p className="text-muted-foreground">
            Gerencie suas conversas e atendimentos
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="ml-2 text-muted-foreground">Carregando canais...</span>
            </div>
          ) : getChannelsByType("whatsapp").length === 0 ? (
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configure um canal WhatsApp</CardTitle>
                  <CardDescription>
                    Você precisa configurar pelo menos um canal WhatsApp para visualizar mensagens.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Acesse a página de <a href="/integrations" className="text-primary hover:underline">Integrações</a> para configurar um canal WhatsApp.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : !hasActiveWhatsAppChannels() ? (
            <div className="p-6">
              <Tabs defaultValue="configuration">
                <TabsList className="mb-4">
                  <TabsTrigger value="configuration">Configuração</TabsTrigger>
                  <TabsTrigger value="conversations" disabled>Conversas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="configuration" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configure seu WhatsApp</CardTitle>
                      <CardDescription>
                        Escaneie o QR Code para conectar seu WhatsApp antes de começar a receber mensagens.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedChannel && (
                        <ZapiConfig 
                          channelId={selectedChannel} 
                          onConnected={() => {
                            // Recarregar página após conexão bem-sucedida
                            window.location.reload();
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex h-full overflow-hidden">
              {/* Painel de conversas (simplificado) */}
              <div className="flex-none w-80 border-r border-border overflow-y-auto">
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-2">Conversas</h2>
                  
                  {conversations && conversations.length > 0 ? (
                    <div className="space-y-2">
                      {conversations.map(conversation => (
                        <div 
                          key={conversation.id}
                          className="p-3 rounded-md hover:bg-accent cursor-pointer border border-border"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                              <MessageSquare className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{conversation.contact?.name || 'Cliente'}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.lastMessage?.content || 'Sem mensagens'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        Nenhuma conversa ativa no momento.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        As conversas aparecerão aqui quando alguém enviar uma mensagem.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Painel de mensagens */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
                    <p className="text-muted-foreground max-w-md">
                      Selecione uma conversa da lista à esquerda para visualizar as mensagens e interagir com seus contatos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default InboxPage;