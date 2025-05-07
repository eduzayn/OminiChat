import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { 
  AlertCircle, 
  Check, 
  Loader2,
  Send,
  QrCode
} from "lucide-react";

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
  
  // Carregar canais Z-API disponíveis para testes
  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingChannels(true);
      try {
        const response = await apiRequest<any>('GET', '/api/channels');
        const zapiChannels = response.filter((channel: any) => 
          channel.type === 'whatsapp' && 
          (channel.provider === 'zapi' || (channel.config && channel.config.provider === 'zapi'))
        );
        
        setChannels(zapiChannels);
        
        // Se tiver canais e nenhum selecionado, seleciona o primeiro
        if (zapiChannels.length > 0 && !selectedChannel) {
          setSelectedChannel(zapiChannels[0].id);
        }
      } catch (error) {
        console.error("Erro ao carregar canais:", error);
      } finally {
        setLoadingChannels(false);
      }
    };
    
    fetchChannels();
  }, []);

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
  
  // Obter QR Code para conexão
  const getQRCode = async () => {
    setQrCodeLoading(true);
    setQrCodeUrl(null);
    
    try {
      const response = await apiRequest<any>(
        'GET',
        `/api/channels/${selectedChannel}/qr-code`,
        null
      );
      
      // Verificar se a resposta é uma imagem
      if (response.type && response.type.startsWith('image/')) {
        // Criar URL para a imagem
        const imageUrl = URL.createObjectURL(response);
        setQrCodeUrl(imageUrl);
        
        toast({
          title: 'QR Code obtido',
          description: 'Escaneie o QR Code com seu WhatsApp para conectar.',
        });
      } else {
        // Se não for uma imagem, provavelmente é um erro como JSON
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const jsonResponse = JSON.parse(reader.result as string);
            console.error("Erro ao obter QR Code:", jsonResponse);
            toast({
              title: 'Erro',
              description: jsonResponse.message || 'Falha ao obter QR Code',
              variant: 'destructive',
            });
          } catch (e) {
            console.error("Erro ao processar resposta:", e);
            toast({
              title: 'Erro',
              description: 'Resposta inválida ao solicitar QR Code',
              variant: 'destructive',
            });
          }
        };
        reader.readAsText(response);
      }
    } catch (error) {
      console.error("Erro ao obter QR Code:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao obter QR Code.',
        variant: 'destructive',
      });
    } finally {
      setQrCodeLoading(false);
    }
  };
  
  // Enviar mensagem de teste
  const sendTestMessage = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o número de telefone e a mensagem.',
        variant: 'destructive',
      });
      return;
    }
    
    setSendingMessage(true);
    
    try {
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      
      const response = await apiRequest<any>(
        'POST',
        `/api/channels/${selectedChannel}/send-message-test`,
        {
          phone: cleanedPhone,
          message: message
        }
      );
      
      console.log("Resposta do envio de mensagem:", response);
      
      if (response.success) {
        toast({
          title: 'Mensagem enviada',
          description: 'Mensagem de teste enviada com sucesso.',
        });
        // Limpar o formulário após envio bem-sucedido
        setMessage('');
      } else {
        toast({
          title: 'Erro no envio',
          description: response.message || 'Falha ao enviar mensagem.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar mensagem de teste.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Testar mensagem de entrada para a caixa de entrada
  const testInboxMessage = async () => {
    if (!selectedChannel) {
      toast({
        title: 'Canal não selecionado',
        description: 'Selecione um canal para testar.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      toast({
        title: 'Enviando mensagem para caixa...',
        description: 'Aguarde enquanto simulamos uma mensagem recebida.'
      });
      
      const response = await apiRequest<any>(
        'POST',
        `/api/channels/${selectedChannel}/test-inbox-message`,
        null
      );
      
      console.log("Resposta do teste de caixa:", response);
      
      if (response.success) {
        toast({
          title: 'Teste concluído',
          description: 'Mensagem de teste enviada para a caixa de entrada.',
        });
      } else {
        toast({
          title: 'Erro no teste',
          description: response.message || 'Falha ao simular mensagem recebida.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao testar caixa de entrada:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar mensagem para caixa de entrada.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Tabs defaultValue="qrcode">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="qrcode">QR Code</TabsTrigger>
        <TabsTrigger value="test">Teste de Mensagem</TabsTrigger>
        <TabsTrigger value="diagnostic">Diagnóstico</TabsTrigger>
      </TabsList>
      
      <TabsContent value="qrcode">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>QR Code Z-API</CardTitle>
            <CardDescription>
              Obtenha o QR Code para conexão com o WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="channel">Canal Z-API</Label>
                <select
                  id="channel"
                  className="w-full p-2 border rounded-md"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(parseInt(e.target.value))}
                  disabled={loadingChannels}
                >
                  {loadingChannels ? (
                    <option>Carregando canais...</option>
                  ) : (
                    <>
                      {channels.length === 0 ? (
                        <option>Nenhum canal disponível</option>
                      ) : (
                        channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name} (ID: {channel.id})
                          </option>
                        ))
                      )}
                    </>
                  )}
                </select>
              </div>
              
              <div>
                <Button 
                  onClick={getQRCode}
                  disabled={qrCodeLoading || !selectedChannel}
                  className="w-full"
                >
                  {qrCodeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {qrCodeLoading ? 'Obtendo QR Code...' : 'Obter QR Code'}
                </Button>
              </div>
              
              {qrCodeUrl && (
                <div className="flex justify-center mt-4 border rounded-md p-4">
                  <div className="flex flex-col items-center">
                    <h3 className="text-md font-medium mb-2">Escaneie com o WhatsApp</h3>
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code WhatsApp" 
                      className="w-64 h-64"
                    />
                    <p className="text-sm text-center mt-2 text-neutral-500">
                      Abra o WhatsApp no seu celular, toque em Menu ou Configurações e selecione "Aparelhos conectados". Em seguida, toque em "Conectar um aparelho" e escaneie o QR Code.
                    </p>
                  </div>
                </div>
              )}
              
              {!qrCodeUrl && !qrCodeLoading && (
                <div className="flex justify-center items-center p-8 border rounded-md border-dashed">
                  <div className="flex flex-col items-center text-neutral-500">
                    <QrCode className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-center">
                      Clique em "Obter QR Code" para exibir o código para conexão
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="test">
        <Card>
          <CardHeader>
            <CardTitle>Teste de Mensagem Z-API</CardTitle>
            <CardDescription>
              Envie mensagens de teste ou simule mensagens recebidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="channel">Canal Z-API</Label>
                <select
                  id="channel-test"
                  className="w-full p-2 border rounded-md"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(parseInt(e.target.value))}
                  disabled={loadingChannels}
                >
                  {loadingChannels ? (
                    <option>Carregando canais...</option>
                  ) : (
                    <>
                      {channels.length === 0 ? (
                        <option>Nenhum canal disponível</option>
                      ) : (
                        channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name} (ID: {channel.id})
                          </option>
                        ))
                      )}
                    </>
                  )}
                </select>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Enviar Mensagem de Teste</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phoneNumber">Número de Telefone (com DDD)</Label>
                    <Input
                      id="phoneNumber"
                      placeholder="Ex: 11912345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      placeholder="Digite sua mensagem de teste aqui"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={sendTestMessage}
                    disabled={sendingMessage || !phoneNumber || !message || !selectedChannel}
                  >
                    {sendingMessage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Send className="h-4 w-4 mr-2" />
                    {sendingMessage ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Simular Mensagem Recebida</h3>
                <div className="space-y-2">
                  <p className="text-sm text-neutral-500">
                    Simule uma mensagem recebida do WhatsApp para testar o fluxo de entrada.
                    Esta ação criará automaticamente um contato de teste e uma conversa na caixa de entrada.
                  </p>
                  <Button 
                    onClick={testInboxMessage}
                    variant="outline"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensagem de Teste para Caixa
                  </Button>
                </div>
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
                      <div className="mt-2 text-sm">
                        <div><strong>ID:</strong> {testResults.channel23.id}</div>
                        <div><strong>Nome:</strong> {testResults.channel23.name}</div>
                        <div><strong>Tipo:</strong> {testResults.channel23.type}</div>
                        <div><strong>Status:</strong> {testResults.channel23.active ? "Ativo" : "Inativo"}</div>
                      </div>
                    )}
                  </div>
                )}
                
                {testResults.environmentVariables && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium">Variáveis de Ambiente</h3>
                    <pre className="bg-gray-50 p-2 rounded text-xs mt-2 overflow-auto">
                      {JSON.stringify(testResults.environmentVariables, null, 2)}
                    </pre>
                  </div>
                )}

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
                        {testResults.zapiConnectionTest.webInstance?.message && (
                          <div className="text-sm mt-1">{testResults.zapiConnectionTest.webInstance.message}</div>
                        )}
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
                        {testResults.zapiConnectionTest.mobileInstance?.message && (
                          <div className="text-sm mt-1">{testResults.zapiConnectionTest.mobileInstance.message}</div>
                        )}
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