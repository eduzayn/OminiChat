import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { 
  CircuitBoard, 
  MessageSquare, 
  Phone, 
  Mail, 
  Webhook, 
  Plus,
  Loader2,
  RefreshCcw,
  DollarSign,
  Check
} from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationCard } from './components/integration-card';
import { ZAPIIntegrationDialog } from './components/zapi-integration';
import { MetaIntegrationDialog } from './components/meta-integration';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

/**
 * Página de Integrações do Sistema
 * 
 * Esta página administra e conecta sistemas externos ao ecossistema OmniConnect.
 * Permite configuração e gerenciamento de todas as integrações com canais de comunicação.
 */
export default function IntegrationsPage() {
  // Estados para diálogos de configuração
  const [zapiDialogOpen, setZapiDialogOpen] = useState(false);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [asaasDialogOpen, setAsaasDialogOpen] = useState(false);
  
  // Estados para seleção de canal para edição
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  
  // Consulta para buscar canais configurados
  const { 
    data: channels, 
    isLoading: isLoadingChannels,
    refetch: refetchChannels
  } = useQuery({
    queryKey: ['/api/channels'],
    retry: false
  });

  // Função para abrir dialog de configuração do canal com dados pré-carregados
  const handleEditChannel = (channel: any) => {
    setSelectedChannel(channel);
    
    if (channel.provider === 'zapi') {
      setZapiDialogOpen(true);
    } else if (channel.provider === 'meta') {
      setMetaDialogOpen(true);
    } else if (channel.provider === 'smtp') {
      setEmailDialogOpen(true);
    } else if (channel.provider === 'asaas') {
      setAsaasDialogOpen(true);
    }
  };

  // Função para abrir dialog de criação de novo canal
  const handleNewChannel = (provider: string) => {
    setSelectedChannel(null);
    
    if (provider === 'zapi') {
      setZapiDialogOpen(true);
    } else if (provider === 'meta') {
      setMetaDialogOpen(true);
    } else if (provider === 'smtp') {
      setEmailDialogOpen(true);
    } else if (provider === 'webhook') {
      setWebhookDialogOpen(true);
    } else if (provider === 'asaas') {
      setAsaasDialogOpen(true);
    }
  };

  // Testes de conexão com canais
  const testChannelConnection = async (channelId: number) => {
    try {
      toast({
        title: "Testando conexão...",
        description: "Aguarde enquanto testamos a conexão com o canal."
      });
      
      const response = await apiRequest<any>(`/api/channels/${channelId}/test`, {
        method: 'POST'
      });
      
      if (response.success) {
        toast({
          title: "Conexão bem-sucedida",
          description: response.message || "O canal está conectado e funcionando corretamente."
        });
      } else {
        toast({
          title: "Problema na conexão",
          description: response.message || "Não foi possível conectar ao canal. Verifique as configurações.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast({
        title: "Erro no teste",
        description: "Ocorreu um erro ao testar a conexão com o canal.",
        variant: "destructive"
      });
    }
  };

  // Função para verificar status do canal
  const getChannelStatus = (channel: any): 'connected' | 'disconnected' | 'pending' | 'error' => {
    if (!channel) return 'disconnected';
    
    // Lógica baseada no status do canal
    if (channel.status === 'active' || channel.isConnected) {
      return 'connected';
    } else if (channel.status === 'error') {
      return 'error';
    } else if (channel.status === 'pending') {
      return 'pending';
    }
    
    return 'disconnected';
  };

  // Função para filtrar canais por provedor
  const getChannelsByProvider = (provider: string) => {
    if (!channels || channels.length === 0) return [];
    return channels.filter((channel: any) => channel.provider === provider);
  };

  // Função para agrupar canais Meta por tipo
  const getMetaChannelsByType = (type: string) => {
    if (!channels || channels.length === 0) return [];
    return channels.filter((channel: any) => channel.provider === 'meta' && channel.type === type);
  };

  return (
    <>
      <Helmet>
        <title>Integrações | OmniConnect</title>
      </Helmet>
      
      <div className="flex h-screen bg-neutral-50">
        <Sidebar />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-6 px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Integrações</h1>
                <p className="text-neutral-500">
                  Configure e gerencie conexões com canais externos
                </p>
              </div>
              
              <Button 
                onClick={() => refetchChannels()} 
                variant="outline" 
                size="sm"
                disabled={isLoadingChannels}
              >
                {isLoadingChannels ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
            
            {/* Integrações de WhatsApp */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                  Integrações de WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ZAPI (não oficial) */}
                  {isLoadingChannels ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span>Carregando canais...</span>
                    </div>
                  ) : (
                    <>
                      {getChannelsByProvider('zapi').map((channel: any) => (
                        <IntegrationCard
                          key={channel.id}
                          title={channel.name || "WhatsApp (Z-API)"}
                          description="WhatsApp via Z-API (não oficial) com conexão por QR Code"
                          icon={MessageSquare}
                          color="bg-green-100 text-green-600"
                          status={getChannelStatus(channel)}
                          onClick={() => handleEditChannel(channel)}
                        />
                      ))}
                      
                      {/* Meta WhatsApp */}
                      {getMetaChannelsByType('whatsapp').map((channel: any) => (
                        <IntegrationCard
                          key={channel.id}
                          title={channel.name || "WhatsApp Business"}
                          description="WhatsApp via API oficial (Meta Business)"
                          icon={MessageSquare}
                          color="bg-green-100 text-green-600"
                          status={getChannelStatus(channel)}
                          onClick={() => handleEditChannel(channel)}
                        />
                      ))}
                      
                      {/* Botões de adição */}
                      <Card 
                        className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleNewChannel('zapi')}
                      >
                        <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-green-600" />
                          </div>
                          <h3 className="font-medium mb-1">Adicionar Z-API</h3>
                          <p className="text-sm text-center text-muted-foreground">
                            Conecte com WhatsApp via Z-API usando QR Code
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card 
                        className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleNewChannel('meta')}
                      >
                        <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-green-600" />
                          </div>
                          <h3 className="font-medium mb-1">Adicionar WhatsApp Business</h3>
                          <p className="text-sm text-center text-muted-foreground">
                            Conecte com WhatsApp via API oficial da Meta
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Integrações de Meta (Facebook/Instagram) */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                  Integrações de Facebook e Instagram
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoadingChannels ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span>Carregando canais...</span>
                    </div>
                  ) : (
                    <>
                      {/* Facebook Messenger */}
                      {getMetaChannelsByType('messenger').map((channel: any) => (
                        <IntegrationCard
                          key={channel.id}
                          title={channel.name || "Facebook Messenger"}
                          description="Mensagens via Facebook Messenger API"
                          icon={MessageSquare}
                          color="bg-blue-100 text-blue-600"
                          status={getChannelStatus(channel)}
                          onClick={() => handleEditChannel(channel)}
                        />
                      ))}
                      
                      {/* Instagram Direct */}
                      {getMetaChannelsByType('instagram').map((channel: any) => (
                        <IntegrationCard
                          key={channel.id}
                          title={channel.name || "Instagram Direct"}
                          description="Mensagens diretas do Instagram via Graph API"
                          icon={MessageSquare}
                          color="bg-purple-100 text-purple-600"
                          status={getChannelStatus(channel)}
                          onClick={() => handleEditChannel(channel)}
                        />
                      ))}
                      
                      {/* Botão de adição */}
                      <Card 
                        className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleNewChannel('meta')}
                      >
                        <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-blue-600" />
                          </div>
                          <h3 className="font-medium mb-1">Adicionar Meta</h3>
                          <p className="text-sm text-center text-muted-foreground">
                            Conecte com Facebook Messenger ou Instagram Direct
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Outras Integrações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outras Integrações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* E-mail (SMTP/IMAP) */}
                  <Card 
                    className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => handleNewChannel('smtp')}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                      <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                        <Mail className="h-6 w-6 text-orange-600" />
                      </div>
                      <h3 className="font-medium mb-1">E-mail (SMTP/IMAP)</h3>
                      <p className="text-sm text-center text-muted-foreground">
                        Conecte com serviços de e-mail para mensagens
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="secondary">Em breve</Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Asaas */}
                  <Card 
                    className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => handleNewChannel('asaas')}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                        <DollarSign className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="font-medium mb-1">Asaas (Pagamentos)</h3>
                      <p className="text-sm text-center text-muted-foreground">
                        Conecte com Asaas para cobranças e pagamentos
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="secondary">Em breve</Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Webhooks */}
                  <Card 
                    className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => handleNewChannel('webhook')}
                  >
                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                      <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mb-3">
                        <Webhook className="h-6 w-6 text-yellow-600" />
                      </div>
                      <h3 className="font-medium mb-1">Webhooks Personalizados</h3>
                      <p className="text-sm text-center text-muted-foreground">
                        Configure webhooks para eventos do sistema
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="secondary">Em breve</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      
      {/* Diálogos de Configuração */}
      <ZAPIIntegrationDialog
        open={zapiDialogOpen}
        onOpenChange={setZapiDialogOpen}
        channel={selectedChannel}
        onChannelCreated={(channelId) => {
          refetchChannels();
          setTimeout(() => testChannelConnection(channelId), 1000);
        }}
        onChannelUpdated={() => refetchChannels()}
      />
      
      <MetaIntegrationDialog
        open={metaDialogOpen}
        onOpenChange={setMetaDialogOpen}
        channel={selectedChannel}
        onChannelCreated={() => refetchChannels()}
        onChannelUpdated={() => refetchChannels()}
      />
    </>
  );
}