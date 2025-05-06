import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Loader2, 
  AlertCircle, 
  Check, 
  QrCode, 
  RefreshCw,
  Send,
  PhoneCall,
  MessageSquare,
  Webhook
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

/**
 * Componente para testar a conexão com as instâncias Z-API
 */
export function ZAPITestPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  
  // Estado para o formulário de envio de mensagem
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<number>(23); // Canal 23 por padrão
  const [channels, setChannels] = useState<any[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Buscar canais disponíveis
  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingChannels(true);
      try {
        const response = await apiRequest<any[]>('GET', '/api/channels', null);
        
        // Filtrar apenas canais WhatsApp com provider zapi
        const zapiChannels = response.filter(
          channel => channel.type === 'whatsapp' && 
                    (channel.config?.provider === 'zapi' || 
                     typeof channel.config === 'object' && 'provider' in channel.config && channel.config.provider === 'zapi')
        );
        
        setChannels(zapiChannels);
        
        if (zapiChannels.length > 0) {
          setSelectedChannel(zapiChannels[0].id);
        }
      } catch (error) {
        console.error("Erro ao buscar canais:", error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os canais disponíveis.',
          variant: 'destructive',
        });
      } finally {
        setLoadingChannels(false);
      }
    };
    
    fetchChannels();
  }, [toast]);

  // Testar conexão com as instâncias Z-API
  const testZAPIInstances = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest<any>(
        'GET',
        '/api/zapi-diagnostic',
        null
      );
      
      console.log("Resultado do diagnóstico Z-API:", response);
      setTestResults(response);
      
      // Mostrar toast com o resultado
      if (response.zapiConnectionTest?.webInstance?.success) {
        toast({
          title: 'Teste concluído',
          description: 'Pelo menos uma instância Z-API está funcionando.',
        });
      } else {
        toast({
          title: 'Teste concluído',
          description: 'Nenhuma instância Z-API está conectada.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao testar instâncias Z-API:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar instâncias Z-API.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Referência para o intervalo de verificação de status
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Função para limpar o intervalo de verificação quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);
  
  // Função para obter o QR code
  const getQrCode = async () => {
    if (!selectedChannel) {
      toast({
        title: 'Erro',
        description: 'Selecione um canal para obter o QR code.',
        variant: 'destructive',
      });
      return;
    }
    
    // Limpar qualquer intervalo existente
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    
    setQrCodeLoading(true);
    setQrCodeUrl(null);
    setConnectionStatus('unknown');
    
    try {
      const response = await apiRequest<any>(
        'GET',
        `/api/channels/${selectedChannel}/qr-code`,
        null
      );
      
      console.log("Resposta do endpoint QR code:", response);
      
      if (response.success && response.qrcode) {
        setQrCodeUrl(response.qrcode);
        setConnectionStatus(response.connected ? 'connected' : 'disconnected');
        
        // Se não estiver conectado, configurar intervalo para verificar status
        if (!response.connected) {
          toast({
            title: 'QR Code obtido',
            description: 'Escaneie com o WhatsApp para conectar.',
          });
          
          // Iniciar intervalo para verificar o status a cada 5 segundos
          const interval = setInterval(async () => {
            try {
              console.log("Verificando automaticamente status da conexão...");
              const statusResponse = await apiRequest<any>(
                'POST',
                `/api/channels/${selectedChannel}/test-connection`,
                null
              );
              
              if (statusResponse.success) {
                console.log("Status da conexão atualizado:", statusResponse);
                setConnectionStatus('connected');
                
                // Se estiver conectado, limpar o QR code e o intervalo
                setQrCodeUrl(null);
                toast({
                  title: 'Conectado',
                  description: 'WhatsApp conectado com sucesso!',
                });
                
                // Limpar intervalo
                clearInterval(interval);
                setStatusCheckInterval(null);
              }
            } catch (error) {
              console.error("Erro ao verificar status:", error);
            }
          }, 5000); // Verificar a cada 5 segundos
          
          setStatusCheckInterval(interval);
        } else {
          // Já está conectado, não precisa mostrar QR code
          setQrCodeUrl(null);
          toast({
            title: 'Já conectado',
            description: 'Este WhatsApp já está conectado.',
          });
        }
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Falha ao obter QR code.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao obter QR code:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao obter QR code.',
        variant: 'destructive',
      });
    } finally {
      setQrCodeLoading(false);
    }
  };

  // Verificar status de conexão
  const checkConnectionStatus = async () => {
    if (!selectedChannel) {
      return;
    }
    
    try {
      const response = await apiRequest<any>(
        'POST',
        `/api/channels/${selectedChannel}/test-connection`,
        null
      );
      
      console.log("Status da conexão:", response);
      
      if (response.success) {
        setConnectionStatus('connected');
        toast({
          title: 'Status da conexão',
          description: 'Canal está conectado!',
        });
      } else {
        setConnectionStatus('disconnected');
        toast({
          title: 'Status da conexão',
          description: 'Canal não está conectado.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao verificar status da conexão:", error);
      setConnectionStatus('unknown');
    }
  };

  // Enviar mensagem de teste
  const sendTestMessage = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o número de telefone e a mensagem.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedChannel) {
      toast({
        title: 'Erro',
        description: 'Selecione um canal para enviar a mensagem.',
        variant: 'destructive',
      });
      return;
    }
    
    setSendingMessage(true);
    
    try {
      const response = await apiRequest<any>(
        'POST',
        `/api/channels/${selectedChannel}/send-message-test`,
        {
          phone: phoneNumber,
          message: message
        }
      );
      
      console.log("Resposta do envio de mensagem:", response);
      
      if (response.success) {
        toast({
          title: 'Mensagem enviada',
          description: `Mensagem enviada com sucesso para ${phoneNumber}!`,
        });
        
        // Limpar campos
        setMessage('');
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Falha ao enviar mensagem.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar mensagem.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Formatar mensagem de erro para exibição
  const formatErrorMessage = (result: any) => {
    if (!result) return 'Informação não disponível';
    
    if (result.success) {
      return result.message || 'Conectado com sucesso';
    } else {
      return result.message || 'Erro de conexão';
    }
  };
  
  // Verificar configuração do webhook
  const verifyWebhookConfiguration = async () => {
    if (!selectedChannel) {
      toast({
        title: 'Erro',
        description: 'Selecione um canal para verificar o webhook.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await apiRequest<any>(
        'GET',
        `/api/channels/${selectedChannel}/webhook-status`,
        null
      );
      
      console.log("Status do webhook:", response);
      
      if (response.success && response.configured) {
        toast({
          title: 'Webhook configurado',
          description: 'O webhook está configurado corretamente.',
        });
      } else {
        toast({
          title: 'Webhook não configurado',
          description: response.message || 'O webhook não está configurado.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao verificar webhook:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao verificar configuração do webhook.',
        variant: 'destructive',
      });
    }
  };
  
  // Configurar webhook
  const configureWebhook = async () => {
    if (!selectedChannel) {
      toast({
        title: 'Erro',
        description: 'Selecione um canal para configurar o webhook.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await apiRequest<any>(
        'POST',
        `/api/channels/${selectedChannel}/configure-webhook`,
        null
      );
      
      console.log("Configuração do webhook:", response);
      
      if (response.success) {
        toast({
          title: 'Webhook configurado',
          description: 'Webhook configurado com sucesso. Mensagens serão recebidas na caixa de entrada.',
        });
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Falha ao configurar webhook.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao configurar webhook.',
        variant: 'destructive',
      });
    }
  };
  
  // Enviar mensagem de teste para caixa de entrada
  const testInboxMessage = async () => {
    if (!selectedChannel) {
      toast({
        title: 'Erro',
        description: 'Selecione um canal para testar.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await apiRequest<any>(
        'POST',
        `/api/channels/${selectedChannel}/test-inbox-message`,
        null
      );
      
      console.log("Teste de mensagem para caixa de entrada:", response);
      
      if (response.success) {
        toast({
          title: 'Mensagem enviada',
          description: 'Mensagem de teste enviada para a caixa de entrada.',
        });
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Falha ao enviar mensagem para caixa de entrada.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao testar caixa de entrada:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar mensagem na caixa de entrada.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Tabs defaultValue="qrcode" className="w-full">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="qrcode">QR Code</TabsTrigger>
        <TabsTrigger value="message">Enviar Mensagem</TabsTrigger>
        <TabsTrigger value="inbox">Caixa de Entrada</TabsTrigger>
        <TabsTrigger value="diagnostic">Diagnóstico</TabsTrigger>
      </TabsList>
      
      <TabsContent value="qrcode">
        <Card>
          <CardHeader>
            <CardTitle>QR Code WhatsApp</CardTitle>
            <CardDescription>
              Obtenha o QR code para conectar um dispositivo WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="channel-select">Canal WhatsApp</Label>
                <select 
                  id="channel-select"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingChannels}
                >
                  {channels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} (ID: {channel.id})
                    </option>
                  ))}
                  {channels.length === 0 && (
                    <option value="">Nenhum canal disponível</option>
                  )}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={getQrCode} disabled={qrCodeLoading || !selectedChannel}>
                  {qrCodeLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="mr-2 h-4 w-4" />
                  )}
                  Obter QR Code
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.open(`/api/qr-test?channel=${selectedChannel}`, '_blank')}
                  disabled={!selectedChannel}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  QR Code em Nova Janela
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={checkConnectionStatus} 
                  disabled={!selectedChannel}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar Status
                </Button>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="font-medium">Status da Conexão:</div>
                  {connectionStatus === 'connected' && (
                    <span className="flex items-center text-green-600">
                      <Check className="h-5 w-5 mr-1" />
                      Conectado
                    </span>
                  )}
                  {connectionStatus === 'disconnected' && (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="h-5 w-5 mr-1" />
                      Desconectado
                    </span>
                  )}
                  {connectionStatus === 'unknown' && (
                    <span className="flex items-center text-gray-600">
                      Desconhecido
                    </span>
                  )}
                </div>
                
                {qrCodeUrl ? (
                  <div className="flex flex-col items-center p-4 border rounded-md">
                    <div className="bg-white p-4 rounded-md shadow mb-4">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code para WhatsApp" 
                        className="max-w-[250px] h-auto"
                      />
                    </div>
                    <p className="text-sm text-center text-gray-500">
                      Escaneie este QR code com seu WhatsApp para conectar
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center p-8 border border-dashed rounded-md text-gray-400">
                    {qrCodeLoading ? (
                      <Loader2 className="h-16 w-16 animate-spin mb-4" />
                    ) : (
                      <QrCode className="h-16 w-16 mb-4" />
                    )}
                    <p className="text-center">
                      {qrCodeLoading 
                        ? "Carregando QR code..." 
                        : "Clique em 'Obter QR Code' para gerar"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="message">
        <Card>
          <CardHeader>
            <CardTitle>Enviar Mensagem de Teste</CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para um número de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="channel-select-message">Canal WhatsApp</Label>
                <select 
                  id="channel-select-message"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingChannels || sendingMessage}
                >
                  {channels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} (ID: {channel.id})
                    </option>
                  ))}
                  {channels.length === 0 && (
                    <option value="">Nenhum canal disponível</option>
                  )}
                </select>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="phone">Número de telefone</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                    +
                  </span>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="5511999999999 (com DDD e sem espaços)"
                    disabled={sendingMessage}
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Inclua o código do país (55 para Brasil) e DDD, sem '+' ou espaços
                </p>
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite a mensagem a ser enviada..."
                  rows={5}
                  disabled={sendingMessage}
                />
              </div>

              <Button 
                onClick={sendTestMessage} 
                disabled={sendingMessage || !phoneNumber || !message || !selectedChannel}
                className="w-full"
              >
                {sendingMessage ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar Mensagem
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="inbox">
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Caixa de Entrada</CardTitle>
            <CardDescription>
              Configure seu canal Z-API para receber e enviar mensagens na caixa de entrada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="channel-select-inbox">Canal WhatsApp</Label>
                <select 
                  id="channel-select-inbox"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingChannels}
                >
                  {channels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} (ID: {channel.id})
                    </option>
                  ))}
                  {channels.length === 0 && (
                    <option value="">Nenhum canal disponível</option>
                  )}
                </select>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium">Status do Webhook</h3>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  O webhook é necessário para receber mensagens do WhatsApp na sua caixa de entrada.
                </p>
                
                <div className="flex items-center gap-4">
                  <Button onClick={() => verifyWebhookConfiguration()} disabled={!selectedChannel}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Webhook
                  </Button>
                  
                  <Button variant="outline" onClick={() => configureWebhook()} disabled={!selectedChannel}>
                    <Webhook className="h-4 w-4 mr-2" />
                    Configurar Webhook
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium">Conexão com a Caixa de Entrada</h3>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Status da integração do canal com a caixa de entrada do sistema.
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="font-medium">Status da Conexão:</div>
                  {connectionStatus === 'connected' ? (
                    <span className="flex items-center text-green-600">
                      <Check className="h-5 w-5 mr-1" />
                      Conectado
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="h-5 w-5 mr-1" />
                      Desconectado
                    </span>
                  )}
                </div>
                
                <Button 
                  onClick={() => testInboxMessage()} 
                  disabled={!selectedChannel || connectionStatus !== 'connected'}
                  variant="secondary"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar Mensagem de Teste para Caixa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="diagnostic">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Diagnóstico Z-API</CardTitle>
            <CardDescription>
              Verifique a configuração e conectividade com a Z-API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults && (
              <div className="space-y-4">
                {testResults.channel23 && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium">Canal 23 (Z-API Test)</h3>
                    <div className="flex items-center mt-2">
                      {testResults.channel23.exists ? (
                        <div className="flex items-center text-green-600">
                          <Check className="h-5 w-5 mr-2" />
                          <span>Canal configurado</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <span>Canal não configurado</span>
                        </div>
                      )}
                    </div>
                    {testResults.channel23.exists && (
                      <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-auto max-h-40">
                        {JSON.stringify(testResults.channel23, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium">Variáveis de Ambiente</h3>
                  <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-auto max-h-40">
                    {JSON.stringify(testResults.environmentVariables, null, 2)}
                  </pre>
                </div>

                {testResults.zapiConnectionTest && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium">Teste de Conexão Z-API</h3>
                    <div className="space-y-2 mt-2">
                      <div>
                        <h4 className="font-medium">Instância Web</h4>
                        <div className="flex items-center mt-1">
                          {testResults.zapiConnectionTest.webInstance?.success ? (
                            <div className="flex items-center text-green-600">
                              <Check className="h-5 w-5 mr-2" />
                              <span>Conectado</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              <span>Desconectado</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium">Instância Mobile</h4>
                        <div className="flex items-center mt-1">
                          {testResults.zapiConnectionTest.mobileInstance?.success ? (
                            <div className="flex items-center text-green-600">
                              <Check className="h-5 w-5 mr-2" />
                              <span>Conectado</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              <span>Desconectado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {testResults.zapiChannels && testResults.zapiChannels.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium">Canais Z-API ({testResults.zapiChannelsCount})</h3>
                    <div className="space-y-2 mt-2">
                      {testResults.zapiChannels.map((channel: any, index: number) => (
                        <div key={index} className="border-b last:border-b-0 pb-2 last:pb-0">
                          <div className="flex justify-between">
                            <span className="font-medium">{channel.name} (ID: {channel.id})</span>
                            <span className={channel.active ? "text-green-600" : "text-red-600"}>
                              {channel.active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!testResults && !isLoading && (
              <div className="text-center py-6 text-gray-500">
                Clique no botão abaixo para executar o diagnóstico Z-API
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={testZAPIInstances} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Executar Diagnóstico Z-API
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}