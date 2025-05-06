import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ZAPIIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingChannel?: any;
}

/**
 * Componente para configuração de integração com a Z-API
 */
export function ZAPIIntegrationDialog({
  open,
  onOpenChange,
  existingChannel,
}: ZAPIIntegrationDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState('config');
  const [channelForm, setChannelForm] = useState({
    id: null as number | null,
    name: 'WhatsApp via Z-API',
    type: 'whatsapp',
    isActive: true,
    config: {
      provider: 'zapi',
      instanceId: '',
      token: '',
    },
  });
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'loading' | 'connected' | 'disconnected'>('unknown');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [usePredefined, setUsePredefined] = useState(true);

  // Carregar dados do canal existente se fornecido
  useEffect(() => {
    if (existingChannel) {
      setChannelForm({
        id: existingChannel.id,
        name: existingChannel.name,
        type: existingChannel.type,
        isActive: existingChannel.isActive,
        config: {
          provider: 'zapi',
          instanceId: existingChannel.config?.instanceId || '',
          token: existingChannel.config?.token || '',
        },
      });
    }
  }, [existingChannel]);

  // Controla toggles entre usar credenciais do ambiente ou personalizadas
  const handleToggleConfigType = () => {
    setUsePredefined(!usePredefined);
    if (usePredefined) {
      // Se mudar para credenciais personalizadas, limpar os campos
      setChannelForm({
        ...channelForm,
        config: {
          ...channelForm.config,
          instanceId: '',
          token: '',
        },
      });
    }
  };

  // Atualizar os valores do formulário
  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setChannelForm({
        ...channelForm,
        [parent]: {
          ...channelForm[parent as keyof typeof channelForm],
          [child]: value,
        },
      });
    } else {
      setChannelForm({
        ...channelForm,
        [field]: value,
      });
    }
  };

  // Verificar status da conexão
  const checkConnectionStatus = async () => {
    setConnectionStatus('loading');
    
    try {
      // Se for um canal existente, verifica o status usando o ID
      if (channelForm.id) {
        const response = await apiRequest<any>(
          `/api/channels/${channelForm.id}/test-connection`,
          'POST',
          { provider: 'zapi' }
        );
        
        if (response.success && response.connected) {
          setConnectionStatus('connected');
          setQrCode(null);
        } else if (response.qrCode) {
          setConnectionStatus('disconnected');
          setQrCode(response.qrCode);
        } else {
          setConnectionStatus('disconnected');
        }
      } else {
        // Para novo canal, apenas verifica se as credenciais estão preenchidas
        setConnectionStatus(
          usePredefined || (channelForm.config.instanceId && channelForm.config.token)
            ? 'disconnected'
            : 'unknown'
        );
      }
    } catch (error) {
      console.error("Erro ao verificar status da conexão:", error);
      setConnectionStatus('disconnected');
    }
  };

  // Verificar status ao mudar de aba
  useEffect(() => {
    if (currentTab === 'status' && channelForm.id) {
      checkConnectionStatus();
    }
  }, [currentTab]);

  // Salvar canal
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Preparar dados para envio
      const payload = {
        ...channelForm,
        config: {
          provider: 'zapi',
          // Se usar predefinido, enviar apenas o provider para usar as variáveis de ambiente
          ...(!usePredefined ? {
            instanceId: channelForm.config.instanceId,
            token: channelForm.config.token,
          } : {}),
        },
      };
      
      // Requisição para criar/atualizar canal
      const url = channelForm.id 
        ? `/api/channels/${channelForm.id}` 
        : '/api/channels';
      
      const method = channelForm.id ? 'PUT' : 'POST';
      
      const response = await apiRequest<any>(url, method, payload);
      
      if (response.success) {
        toast({
          title: channelForm.id ? 'Canal atualizado' : 'Canal criado',
          description: `Canal de WhatsApp via Z-API ${channelForm.id ? 'atualizado' : 'criado'} com sucesso.`,
        });
        
        // Atualizar o ID do canal se for novo
        if (!channelForm.id && response.channel?.id) {
          setChannelForm({
            ...channelForm,
            id: response.channel.id,
          });
        }
        
        // Mudar para a aba de status
        setCurrentTab('status');
        
        // Invalidar cache para recarregar lista de canais
        queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
        
        // Verificar status de conexão
        checkConnectionStatus();
      } else {
        throw new Error(response.message || 'Erro ao salvar canal');
      }
    } catch (error) {
      console.error("Erro ao salvar canal:", error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar canal',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{existingChannel ? 'Editar' : 'Adicionar'} WhatsApp via Z-API</DialogTitle>
          <DialogDescription>
            Conecte o sistema ao WhatsApp através da Z-API, permitindo envio e recebimento de mensagens.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="status" disabled={!channelForm.id}>
              Status e Conexão
            </TabsTrigger>
          </TabsList>

          {/* Aba de Configuração */}
          <TabsContent value="config">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Canal</Label>
                  <Input
                    id="name"
                    value={channelForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: WhatsApp Vendas"
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <input
                    type="checkbox"
                    id="usePredefined"
                    checked={usePredefined}
                    onChange={handleToggleConfigType}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="usePredefined" className="text-sm font-medium">
                    Usar credenciais configuradas no ambiente
                  </Label>
                </div>
                
                {!usePredefined && (
                  <>
                    <div>
                      <Label htmlFor="instanceId">ID da Instância Z-API</Label>
                      <Input
                        id="instanceId"
                        value={channelForm.config.instanceId}
                        onChange={(e) => handleInputChange('config.instanceId', e.target.value)}
                        placeholder="3DF871A7ADFB20FB49998E66062CE0C1"
                        required={!usePredefined}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="token">Token da Z-API</Label>
                      <Input
                        id="token"
                        type="password"
                        value={channelForm.config.token}
                        onChange={(e) => handleInputChange('config.token', e.target.value)}
                        placeholder="Token de segurança da Z-API"
                        required={!usePredefined}
                      />
                    </div>
                  </>
                )}
                
                <div className="bg-blue-50 p-4 rounded-md mt-4">
                  <h4 className="text-sm font-medium text-blue-800">Informação</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {usePredefined 
                      ? 'Utilizando credenciais configuradas no ambiente. Após salvar, acesse a aba "Status e Conexão" para validar a conexão.'
                      : 'Forneça as credenciais da Z-API para configurar o canal. Você pode obter essas informações no painel administrativo da Z-API.'}
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {existingChannel ? 'Atualizar' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Aba de Status e Conexão */}
          <TabsContent value="status">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status da Conexão</CardTitle>
                  <CardDescription>
                    Verifique o status da conexão com o WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    {connectionStatus === 'loading' ? (
                      <div className="flex items-center text-amber-600">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Verificando conexão...</span>
                      </div>
                    ) : connectionStatus === 'connected' ? (
                      <div className="flex items-center text-green-600">
                        <Check className="h-5 w-5 mr-2" />
                        <span>WhatsApp conectado e funcionando</span>
                      </div>
                    ) : connectionStatus === 'disconnected' ? (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>WhatsApp desconectado</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <span>Status desconhecido</span>
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code para conexão, se disponível */}
                  {qrCode && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Escaneie o QR Code com seu WhatsApp</h4>
                      <div className="flex justify-center bg-white p-4 rounded-md">
                        <img 
                          src={`data:image/png;base64,${qrCode}`} 
                          alt="QR Code para conexão WhatsApp" 
                          className="w-64 h-64"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Abra o WhatsApp no seu celular, vá em Configurações {'>>'} Aparelhos conectados {'>>'} Conectar um aparelho
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={checkConnectionStatus} 
                    variant="outline" 
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar conexão
                  </Button>
                </CardFooter>
              </Card>

              <div className="bg-amber-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-amber-800">Importante</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Para que a integração funcione corretamente, o WhatsApp conectado deve permanecer ativo.
                  A desconexão pode ocorrer se o aparelho principal (celular) ficar sem internet por mais de 14 dias.
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}