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
import ZAPIDiagnosticPanel from '@/components/zapi-diagnostic-panel';

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
    id: undefined,
    name: 'WhatsApp via Z-API',
    type: 'whatsapp',
    isActive: true,
    config: {
      provider: 'zapi',
      instanceId: '3DF871A7ADF830F8499BE6006CECDC1',
      token: 'A4E4203C24887ZDA084747',
      clientToken: 'Fa427b12e188a433292a658fe45a07714S',
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
          clientToken: existingChannel.config?.clientToken || '',
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
          clientToken: '',
        },
      });
    }
  };

  // Atualizar os valores do formulário
  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'config') {
        setChannelForm({
          ...channelForm,
          config: {
            ...channelForm.config,
            [child]: value,
          },
        });
      }
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
        // Verificar status da conexão usando teste explícito
        const testResponse = await apiRequest<any>(
          'POST',
          `/api/channels/${channelForm.id}/test-connection`,
          null
        );
        
        console.log("Resposta do teste de conexão:", JSON.stringify(testResponse));
        
        // Se o teste direto indicar que está conectado, confiar nessa informação
        if (testResponse && testResponse.success === true) {
          setConnectionStatus('connected');
          setQrCode(null);
          console.log("Conexão confirmada via test-connection");
          return;
        }
        
        // Caso contrário, verificar através do endpoint de QRCode
        const response = await apiRequest<any>(
          'GET',
          `/api/channels/${channelForm.id}/qrcode`,
          null
        );
        
        console.log("Resposta do endpoint QR code:", JSON.stringify(response));
        
        // Verificar se a resposta contém informação sobre um status "connected"
        // ou se a mensagem indica que já está conectado
        if (
          (response.success && response.status === "connected") || 
          (response.success && response.message && response.message.includes("conectado")) ||
          (response.success && response.status === "success" && !response.qrcode && !response.qrCode)
        ) {
          setConnectionStatus('connected');
          setQrCode(null);
        } 
        // Verificar se temos QR code para exibir (aguardando leitura)
        else if (response.success && response.status === "waiting_scan" && (response.qrcode || response.qrCode)) {
          setConnectionStatus('disconnected');
          setQrCode(response.qrcode || response.qrCode);
          console.log("QR Code recebido para leitura");
        } 
        // Verificar casos específicos que indicam conexão mesmo com status diferente
        else if (
          response.error && 
          (response.error.includes("already connected") || response.error.includes("You are connected"))
        ) {
          setConnectionStatus('connected');
          setQrCode(null);
          console.log("Conexão detectada por mensagem de erro específica");
        }
        else {
          setConnectionStatus('disconnected');
          console.log("Status da conexão:", response.status);
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
      // Preparar dados para envio - sem incluir o ID em novas criações
      const payload = {
        name: channelForm.name,
        type: channelForm.type,
        isActive: channelForm.isActive,
        config: {
          provider: 'zapi',
          // Se usar predefinido, enviar apenas o provider para usar as variáveis de ambiente
          ...(!usePredefined ? {
            instanceId: channelForm.config.instanceId,
            token: channelForm.config.token,
            clientToken: channelForm.config.clientToken,
          } : {}),
        },
      };
      
      // Adicionar ID somente se estiver editando (id existente e diferente de undefined)
      if (channelForm.id !== undefined) {
        (payload as any).id = channelForm.id;
      }
      
      console.log("Enviando payload:", JSON.stringify(payload));
      
      // Requisição para criar/atualizar canal
      const url = channelForm.id 
        ? `/api/channels/${channelForm.id}` 
        : '/api/channels';
      
      const method = channelForm.id ? 'PUT' : 'POST';
      
      const response = await apiRequest<any>(method, url, payload);
      
      console.log("Resposta recebida:", JSON.stringify(response));
      
      // A API retorna o objeto do canal diretamente, não envolto em { success: true }
      // Verificamos se temos um ID no retorno, o que indica sucesso
      if (response && response.id) {
        toast({
          title: channelForm.id ? 'Canal atualizado' : 'Canal criado',
          description: `Canal de WhatsApp via Z-API ${channelForm.id ? 'atualizado' : 'criado'} com sucesso.`,
        });
        
        // Atualizar o ID do canal se for novo
        if (!channelForm.id) {
          setChannelForm({
            ...channelForm,
            id: response.id,
          });
        }
        
        // Mudar para a aba de status
        setCurrentTab('status');
        
        // Invalidar cache para recarregar lista de canais
        queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
        
        // Verificar status de conexão
        checkConnectionStatus();
      } else if (response.message === "Operação realizada com sucesso") {
        // Este caso especial ocorre quando a resposta é um sucesso mas é retornada como HTML que foi processado
        // Trate como se fosse um sucesso
        console.log("Operação realizada com sucesso, apesar do formato de resposta não ser ideal");
        
        // Mudar para a aba de status
        setCurrentTab('status');
        
        // Invalidar cache para recarregar lista de canais
        queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
        
        // Verificar status de conexão
        checkConnectionStatus();
      } else {
        throw new Error(response.message || 'Erro ao salvar canal. Resposta inválida da API.');
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="status" disabled={!channelForm.id}>
              Status e Conexão
            </TabsTrigger>
            <TabsTrigger value="diagnostic" disabled={!channelForm.id}>
              Diagnóstico
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
                        placeholder="Token de segurança da instância Z-API"
                        required={!usePredefined}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="clientToken">Client Token da Conta Z-API</Label>
                      <Input
                        id="clientToken"
                        type="password"
                        value={channelForm.config.clientToken}
                        onChange={(e) => handleInputChange('config.clientToken', e.target.value)}
                        placeholder="Token de segurança da conta Z-API"
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
                      <div className="flex flex-col">
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <span>WhatsApp desconectado - necessário reconectar</span>
                        </div>
                        <p className="text-sm text-red-500 mt-2">
                          Atenção: Enquanto o WhatsApp estiver desconectado, não será possível enviar ou receber mensagens.
                          Escaneie o QR Code abaixo para conectar seu WhatsApp.
                        </p>
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
                  <div className="flex flex-col space-y-2 w-full">
                    <div className="flex space-x-2">
                      <Button 
                        onClick={checkConnectionStatus} 
                        variant="outline" 
                        className="flex-1"
                        disabled={connectionStatus === 'loading'}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${connectionStatus === 'loading' ? 'animate-spin' : ''}`} />
                        Verificar conexão
                      </Button>
                      
                      <Button 
                        onClick={async () => {
                          setConnectionStatus('loading');
                          try {
                            console.log(`Reiniciando sessão para canal ID: ${channelForm.id}`);
                            const response = await apiRequest<any>(
                              'POST',
                              `/api/channels/${channelForm.id}/restart-session`,
                              null
                            );
                            
                            console.log("Resposta do reinício de sessão:", response);
                            
                            if (response && response.success) {
                              toast({
                                title: 'Sessão reiniciada',
                                description: 'A sessão do WhatsApp foi reiniciada. Aguarde alguns instantes e tente verificar a conexão novamente.',
                              });
                              // Esperar um curto período e então verificar o status novamente para obter o QR Code
                              setTimeout(() => {
                                checkConnectionStatus();
                              }, 2000);
                            } else {
                              throw new Error(response?.message || 'Erro ao reiniciar sessão');
                            }
                          } catch (error) {
                            console.error("Erro ao reiniciar sessão:", error);
                            toast({
                              title: 'Erro ao reiniciar',
                              description: error instanceof Error ? error.message : 'Erro ao reiniciar sessão do WhatsApp',
                              variant: 'destructive',
                            });
                            setConnectionStatus('disconnected');
                          }
                        }}
                        variant="destructive" 
                        className="flex-1"
                        disabled={connectionStatus === 'loading' || !channelForm.id}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reiniciar sessão
                      </Button>
                    </div>
                    
                    {connectionStatus === 'disconnected' && (
                      <p className="text-sm text-center text-amber-600">
                        Se o QR Code não aparecer, tente reiniciar a sessão e verificar novamente. 
                        O serviço pode estar gerando um novo código.
                      </p>
                    )}
                  </div>
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

          {/* Aba de Diagnóstico */}
          <TabsContent value="diagnostic">
            <div className="space-y-6">
              {channelForm.id && (
                <ZAPIDiagnosticPanel 
                  channelId={channelForm.id} 
                  onDiagnosticComplete={() => {
                    // Após o diagnóstico, podemos verificar o status de conexão novamente
                    checkConnectionStatus();
                  }}
                />
              )}
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