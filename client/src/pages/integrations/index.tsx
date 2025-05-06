import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { MetaIntegrationDialog } from './components/meta-integration';
import { ZAPIIntegrationDialog } from './components/zapi-integration';
import { ZAPITestPanel } from './components/zapi-test';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

/**
 * Página de Integrações do Sistema
 * 
 * Esta página administra e conecta sistemas externos ao ecossistema OmniConnect.
 * Permite configuração e gerenciamento de todas as integrações com canais de comunicação.
 */
export default function IntegrationsPage() {
  // Acessar o query client para invalidar cache
  const queryClient = useQueryClient();
  
  // Estados para diálogos de configuração
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [zapiDialogOpen, setZapiDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [asaasDialogOpen, setAsaasDialogOpen] = useState(false);
  
  // Estados para seleção de canal para edição
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  
  // Consulta para buscar canais configurados
  const { 
    data: channels = [], 
    isLoading: isLoadingChannels,
    refetch: refetchChannels
  } = useQuery<any[]>({
    queryKey: ['/api/channels'],
    retry: false
  });

  // Função para excluir um canal
  const handleDeleteChannel = async (channelId: number) => {
    if (!confirm("Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', `/api/channels/${channelId}`);
      
      if (response.success) {
        toast({
          title: "Canal excluído",
          description: "O canal foi excluído com sucesso.",
        });
        
        // Recarregar lista de canais
        queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      } else {
        throw new Error(response.message || 'Erro ao excluir canal');
      }
    } catch (error) {
      console.error("Erro ao excluir canal:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao excluir canal',
        variant: "destructive"
      });
    }
  };

  // Função para abrir dialog de configuração do canal com dados pré-carregados
  const handleEditChannel = (channel: any) => {
    setSelectedChannel(channel);
    
    // Verificar provider no objeto principal ou dentro do config
    const provider = channel.provider || (channel.config && channel.config.provider);
    
    if (provider === 'meta' || (channel.config && channel.config.provider === 'meta')) {
      setMetaDialogOpen(true);
    } else if (provider === 'zapi' || (channel.config && channel.config.provider === 'zapi')) {
      setZapiDialogOpen(true);
    } else if (provider === 'smtp') {
      setEmailDialogOpen(true);
    } else if (provider === 'asaas') {
      setAsaasDialogOpen(true);
    } else {
      console.log('Tipo de canal não reconhecido:', channel);
      toast({
        title: "Tipo de canal não suportado",
        description: "Este tipo de canal ainda não possui interface de configuração.",
        variant: "destructive"
      });
    }
  };

  // Função para abrir dialog de criação de novo canal
  const handleNewChannel = (provider: string) => {
    console.log(`Abrindo dialog para novo canal: ${provider}`);
    setSelectedChannel(null);
    
    if (provider === 'meta') {
      console.log('Abrindo dialog para Meta');
      setMetaDialogOpen(true);
    } else if (provider === 'zapi') {
      console.log('Abrindo dialog para Z-API');
      setZapiDialogOpen(true);
    } else if (provider === 'smtp') {
      console.log('Abrindo dialog para SMTP');
      setEmailDialogOpen(true);
    } else if (provider === 'webhook') {
      console.log('Abrindo dialog para Webhook');
      setWebhookDialogOpen(true);
    } else if (provider === 'asaas') {
      console.log('Abrindo dialog para Asaas');
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
      
      const response = await apiRequest<{success?: boolean; message?: string; statusCode?: number}>("POST", `/api/channels/${channelId}/test`);
      
      console.log('Resposta do teste de conexão:', response);
      
      // Considera sucesso se success é true ou se statusCode for 2xx
      const isSuccess = response.success === true || 
                        (response.statusCode && response.statusCode >= 200 && response.statusCode < 300);
      
      if (isSuccess) {
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
    
    // Verificar primeiro em status
    if (channel.status === 'active' || channel.status === 'connected' || channel.isConnected) {
      return 'connected';
    } 
    
    // Depois verificar em config
    if (channel.config) {
      if (channel.config.status === 'active' || channel.config.status === 'connected' || channel.config.isConnected) {
        return 'connected';
      } else if (channel.config.status === 'error') {
        return 'error';
      } else if (channel.config.status === 'pending') {
        return 'pending';
      }
    }
    
    // Verificação direta
    if (channel.status === 'error') {
      return 'error';
    } else if (channel.status === 'pending') {
      return 'pending';
    }
    
    // Verificação adicional para canais que registram a última conexão
    if (channel.lastConnection) {
      const lastConnectionTime = new Date(channel.lastConnection).getTime();
      const now = new Date().getTime();
      const diffHours = (now - lastConnectionTime) / (1000 * 60 * 60);
      
      // Se conectou nas últimas 24h, considerar conectado
      if (diffHours < 24) {
        return 'connected';
      }
    }
    
    return 'disconnected';
  };

  // Função para filtrar canais por provedor
  const getChannelsByProvider = (provider: string) => {
    if (!channels || !Array.isArray(channels) || channels.length === 0) return [];
    return channels.filter((channel: any) => {
      // Verificar se o tipo é compatible (WhatsApp para Z-API)
      if (provider === 'zapi' && channel.type !== 'whatsapp') {
        return false;
      }
      
      // Para canais com provider dentro do config
      if (channel.config && channel.config.provider === provider) {
        return true;
      }
      // Para canais com provider diretamente no objeto
      return channel.provider === provider;
    });
  };

  // Função para agrupar canais Meta por tipo
  const getMetaChannelsByType = (type: string) => {
    if (!channels || !Array.isArray(channels) || channels.length === 0) return [];
    return channels.filter((channel: any) => {
      // Filtra apenas canais Meta que NÃO são Z-API
      return (channel.provider === 'meta' || 
             (channel.config && channel.config.provider === 'meta' && 
              channel.config.provider !== 'zapi')) && 
             channel.type === type;
    });
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
            
            {/* Teste de Instâncias Z-API */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CircuitBoard className="h-5 w-5 mr-2 text-blue-600" />
                  Diagnóstico Z-API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ZAPITestPanel />
              </CardContent>
            </Card>

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
                  {/* WhatsApp Integrations */}
                  {isLoadingChannels ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span>Carregando canais...</span>
                    </div>
                  ) : (
                    <>
                      {/* Meta WhatsApp */}
                      {getMetaChannelsByType('whatsapp').map((channel: any) => (
                        <IntegrationCard
                          key={channel.id}
                          id={channel.id}
                          title={channel.name || "WhatsApp Business"}
                          description="WhatsApp via API oficial (Meta Business)"
                          icon={MessageSquare}
                          color="bg-green-100 text-green-600"
                          status={getChannelStatus(channel)}
                          onClick={() => handleEditChannel(channel)}
                        />
                      ))}
                      
                      {/* Z-API WhatsApp */}
                      {getChannelsByProvider('zapi').map((channel: any) => (
                        <IntegrationCard
                          key={channel.id}
                          id={channel.id}
                          title={channel.name || "WhatsApp via Z-API"}
                          description="WhatsApp via Z-API (QR Code)"
                          icon={MessageSquare}
                          color="bg-green-100 text-green-700"
                          status={getChannelStatus(channel)}
                          onClick={() => handleEditChannel(channel)}
                          onDelete={() => handleDeleteChannel(channel.id)}
                        />
                      ))}
                      
                      {/* Botão de adição Meta */}
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
                      
                      {/* Botão de adição Z-API */}
                      <Card 
                        className="border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleNewChannel('zapi')}
                      >
                        <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[160px]">
                          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-green-700" />
                          </div>
                          <h3 className="font-medium mb-1">Adicionar WhatsApp via Z-API</h3>
                          <p className="text-sm text-center text-muted-foreground">
                            Conecte com WhatsApp via Z-API (conexão por QR Code)
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
                          id={channel.id}
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
                          id={channel.id}
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
      <MetaIntegrationDialog
        open={metaDialogOpen}
        onOpenChange={setMetaDialogOpen}
        existingChannel={selectedChannel}
      />

      <ZAPIIntegrationDialog
        open={zapiDialogOpen}
        onOpenChange={setZapiDialogOpen}
        existingChannel={selectedChannel}
      />
    </>
  );
}