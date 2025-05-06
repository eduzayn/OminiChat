import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Check, AlertCircle, QrCode, Phone, MessageSquareText } from "lucide-react";

interface ZapiConfigProps {
  channelId: number;
  onConnected?: () => void;
}

export function ZapiConfig({ channelId, onConnected }: ZapiConfigProps) {
  const [qrCodePolling, setQrCodePolling] = useState<NodeJS.Timeout | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obter status de conexão
  const { data: status, isLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/channels', channelId, 'webhook-status'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/channels/${channelId}/webhook-status`);
        return response;
      } catch (error) {
        console.error("Erro ao obter status do webhook:", error);
        return { 
          success: false, 
          message: "Erro ao obter status", 
          isConnected: false 
        };
      }
    },
    refetchInterval: 10000, // Refetch status a cada 10 segundos
  });

  // Obter QR Code
  const { data: qrCodeData, isLoading: isLoadingQrCode, refetch: refetchQrCode } = useQuery({
    queryKey: ['/api/channels', channelId, 'qr-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/channels/${channelId}/qr-code`);
        return response;
      } catch (error) {
        console.error("Erro ao obter QR code:", error);
        return { 
          success: false, 
          message: "Erro ao obter QR code", 
          qrCode: null 
        };
      }
    },
    enabled: status?.isConnected === false, // Só buscar QR code se não estiver conectado
    refetchOnWindowFocus: false,
  });

  // Mutation para configurar webhook
  const configureWebhookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/channels/${channelId}/configure-webhook`, {});
    },
    onSuccess: () => {
      toast({
        title: "Webhook configurado",
        description: "Webhook configurado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/channels', channelId, 'webhook-status'] });
    },
    onError: (error) => {
      console.error("Erro ao configurar webhook:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível configurar o webhook",
      });
    },
  });

  // Mutation para enviar mensagem de teste
  const sendTestMessageMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/channels/${channelId}/send-message-test`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Mensagem enviada",
        description: "Mensagem de teste enviada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Erro ao enviar mensagem de teste:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a mensagem de teste",
      });
    },
  });

  // Gestão do polling para QR Code
  useEffect(() => {
    // Se não está conectado e não há polling em andamento, iniciar polling
    if (status?.isConnected === false && !qrCodePolling && pollingCount < 10) {
      const polling = setInterval(() => {
        refetchQrCode();
        setPollingCount(prev => prev + 1);
      }, 15000); // Atualizar a cada 15 segundos
      
      setQrCodePolling(polling);
    }
    
    // Se está conectado, parar polling
    if (status?.isConnected === true && qrCodePolling) {
      clearInterval(qrCodePolling);
      setQrCodePolling(null);
      setPollingCount(0);
      
      // Notificar que está conectado
      if (onConnected) {
        onConnected();
      }
    }
    
    // Se atingiu o limite de polling, parar
    if (pollingCount >= 10 && qrCodePolling) {
      clearInterval(qrCodePolling);
      setQrCodePolling(null);
      toast({
        variant: "destructive",
        title: "Tempo limite excedido",
        description: "O tempo para escanear o QR code expirou. Clique em 'Atualizar QR Code' para gerar um novo.",
      });
    }
    
    // Cleanup na desmontagem
    return () => {
      if (qrCodePolling) {
        clearInterval(qrCodePolling);
      }
    };
  }, [status?.isConnected, qrCodePolling, pollingCount, refetchQrCode, onConnected, toast]);

  // Reiniciar processo de QR Code
  const handleRefreshQrCode = () => {
    setPollingCount(0);
    refetchQrCode();
    
    toast({
      title: "QR Code atualizado",
      description: "Um novo QR Code foi gerado. Escaneie-o com seu WhatsApp.",
    });
  };

  // Configurar webhook
  const handleConfigureWebhook = () => {
    configureWebhookMutation.mutate();
  };

  // Enviar mensagem de teste
  const handleSendTestMessage = () => {
    sendTestMessageMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do WhatsApp (Z-API)</CardTitle>
        <CardDescription>
          Configure seu número de WhatsApp para receber e enviar mensagens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2 text-muted-foreground">Verificando status...</span>
          </div>
        ) : status?.isConnected ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4" />
              <AlertTitle>Conectado</AlertTitle>
              <AlertDescription>
                Seu número de WhatsApp está conectado e pronto para receber e enviar mensagens.
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-md">
                <Phone className="h-5 w-5 mb-2 text-muted-foreground" />
                <h3 className="text-sm font-medium">Status do Webhook</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {status.webhookConfigured ? 
                    "Webhook configurado e funcionando" : 
                    "Webhook não configurado"}
                </p>
                {!status.webhookConfigured && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={handleConfigureWebhook}
                    disabled={configureWebhookMutation.isPending}
                  >
                    {configureWebhookMutation.isPending && (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Configurar Webhook
                  </Button>
                )}
              </div>
              
              <div className="p-4 border rounded-md">
                <MessageSquareText className="h-5 w-5 mb-2 text-muted-foreground" />
                <h3 className="text-sm font-medium">Teste de Mensagem</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Envie uma mensagem de teste para verificar a conexão.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleSendTestMessage}
                  disabled={sendTestMessageMutation.isPending}
                >
                  {sendTestMessageMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enviar Mensagem de Teste
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Desconectado</AlertTitle>
              <AlertDescription>
                Seu número de WhatsApp não está conectado. Escaneie o QR Code abaixo com seu WhatsApp para conectar.
              </AlertDescription>
            </Alert>
            
            {isLoadingQrCode ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2 text-muted-foreground">Gerando QR Code...</span>
              </div>
            ) : qrCodeData?.qrCode ? (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="border p-4 rounded-md mb-4">
                  <img 
                    src={`data:image/png;base64,${qrCodeData.qrCode}`} 
                    alt="QR Code para conectar WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Abra o WhatsApp em seu telefone, vá para Configurações &gt; Aparelhos vinculados &gt; Vincular um aparelho e escaneie o QR Code acima.
                  </p>
                  <p className="text-sm font-medium text-orange-600">
                    QR Code expira em {Math.max(0, 10 - pollingCount)} atualizações
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 border rounded-md">
                <QrCode className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">QR Code não disponível</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Não foi possível gerar o QR Code. {qrCodeData?.message || "Tente novamente mais tarde."}
                </p>
                <Button variant="outline" size="sm" onClick={handleRefreshQrCode}>
                  Atualizar QR Code
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => refetchStatus()}>
          Atualizar Status
        </Button>
        {!status?.isConnected && qrCodeData?.qrCode && (
          <Button 
            variant="outline" 
            onClick={handleRefreshQrCode}
            disabled={pollingCount === 0}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${pollingCount === 0 ? 'animate-spin' : ''}`} />
            Atualizar QR Code
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}