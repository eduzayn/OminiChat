import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ZAPIChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingChannel?: any;
  onSuccess?: () => void;
}

export function ZAPIChannelDialog({
  open,
  onOpenChange,
  existingChannel,
  onSuccess,
}: ZAPIChannelDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados para formulário
  const [name, setName] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [useEnvVars, setUseEnvVars] = useState(false);
  
  // Estados para feedback visual
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "waiting_scan" | "error">("disconnected");
  const [channelId, setChannelId] = useState<number | null>(null);
  
  // Efeito para preencher os campos ao editar um canal existente
  useEffect(() => {
    if (existingChannel) {
      setName(existingChannel.name || "");
      setInstanceId(existingChannel.config?.instanceId || "");
      setToken(existingChannel.config?.token || "");
      setClientToken(existingChannel.config?.clientToken || "");
      setChannelId(existingChannel.id);
      
      // Verificar se o canal já está conectado para mostrar o status
      if (existingChannel.status === "active") {
        setConnectionStatus("connected");
      }
    } else {
      // Resetar campos para um novo canal
      setName("");
      setInstanceId("");
      setToken("");
      setClientToken("");
      setChannelId(null);
      setConnectionStatus("disconnected");
    }
  }, [existingChannel, open]);
  
  // Função para salvar o canal
  const handleSaveChannel = async () => {
    try {
      setIsLoading(true);
      
      const channelData = {
        name,
        type: "whatsapp",
        config: {
          provider: "zapi",
          instanceId: useEnvVars ? undefined : instanceId,
          token: useEnvVars ? undefined : token,
          clientToken: useEnvVars ? undefined : clientToken,
          useEnvVars
        }
      };
      
      const url = existingChannel 
        ? `/api/channels/${existingChannel.id}` 
        : "/api/channels";
      
      const method = existingChannel ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(channelData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao salvar canal");
      }
      
      // Salva o ID do canal para poder testar a conexão
      if (!existingChannel) {
        setChannelId(data.id);
      }
      
      // Invalidar cache de canais
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      
      toast({
        description: `Canal ${existingChannel ? "atualizado" : "criado"} com sucesso`,
        duration: 3000
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Se não for uma edição, manter o diálogo aberto para que o usuário possa testar a conexão/QR Code
      if (existingChannel) {
        onOpenChange(false);
      } else {
        // Iniciar o teste de conexão
        handleTestConnection(data.id);
      }
      
    } catch (error) {
      console.error("Erro ao salvar canal:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar canal",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para testar a conexão com a Z-API
  const handleTestConnection = async (id: number = channelId || 0) => {
    if (!id) {
      toast({
        variant: "destructive",
        description: "ID do canal inválido",
        duration: 3000
      });
      return;
    }
    
    try {
      setIsTestingConnection(true);
      setConnectionStatus("disconnected");
      
      const response = await fetch(`/api/channels/${id}/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao testar conexão");
      }
      
      console.log("Status da conexão:", data);
      
      if (data.success && data.connected) {
        // Conexão ativa
        setConnectionStatus("connected");
        toast({
          description: "WhatsApp conectado com sucesso",
          duration: 3000
        });
      } else if (data.qrcode) {
        // QR Code para escanear
        setQrCodeData(data.qrcode);
        setConnectionStatus("waiting_scan");
        
        // Iniciar polling para verificar status da conexão
        startCheckingConnection(id);
      } else {
        // Erro ou não conectado
        setConnectionStatus("error");
        toast({
          variant: "destructive",
          description: data.message || "Erro ao obter status da conexão",
          duration: 5000
        });
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      setConnectionStatus("error");
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        duration: 5000
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Polling para verificar o status da conexão após exibir o QR Code
  const startCheckingConnection = (id: number) => {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutos (10s * 30)
    
    const checkInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/channels/${id}/test-connection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.connected) {
          // Conexão estabelecida com sucesso
          clearInterval(checkInterval);
          setConnectionStatus("connected");
          setQrCodeData("");
          
          toast({
            description: "WhatsApp conectado com sucesso",
            duration: 3000
          });
          
          // Invalidar cache de canais
          queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
        }
      } catch (error) {
        console.error("Erro ao verificar status da conexão:", error);
      }
      
      // Parar de verificar após o número máximo de tentativas
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        
        if (connectionStatus !== "connected") {
          setConnectionStatus("error");
          toast({
            variant: "destructive",
            description: "Tempo limite excedido para conexão com WhatsApp",
            duration: 5000
          });
        }
      }
    }, 10000); // Verificar a cada 10 segundos
    
    // Limpar o intervalo ao fechar o diálogo
    return () => clearInterval(checkInterval);
  };
  
  // Função para obter o QR Code
  const handleGetQRCode = async () => {
    if (!channelId) {
      toast({
        variant: "destructive",
        description: "Salve o canal primeiro para obter o QR Code",
        duration: 3000
      });
      return;
    }
    
    try {
      setIsTestingConnection(true);
      
      const response = await fetch(`/api/channels/${channelId}/qrcode`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao obter QR Code");
      }
      
      if (data.qrcode) {
        setQrCodeData(data.qrcode);
        setConnectionStatus("waiting_scan");
        
        // Iniciar polling para verificar status da conexão
        startCheckingConnection(channelId);
      } else if (data.status === "connected") {
        setConnectionStatus("connected");
        toast({
          description: "WhatsApp já está conectado",
          duration: 3000
        });
      } else {
        setConnectionStatus("error");
        toast({
          variant: "destructive",
          description: data.message || "Erro ao obter QR Code",
          duration: 5000
        });
      }
    } catch (error) {
      console.error("Erro ao obter QR Code:", error);
      setConnectionStatus("error");
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        duration: 5000
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingChannel ? 'Editar Canal WhatsApp (Z-API)' : 'Novo Canal WhatsApp (Z-API)'}
          </DialogTitle>
          <DialogDescription>
            {existingChannel 
              ? 'Atualize as configurações do seu canal WhatsApp via Z-API'
              : 'Configure um novo canal WhatsApp usando Z-API'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              placeholder="WhatsApp Vendas"
              className="col-span-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right">
              <Label htmlFor="useEnvVars">Credenciais</Label>
            </div>
            <div className="col-span-3">
              <Button
                variant="outline"
                type="button"
                className={`mr-2 ${useEnvVars ? "bg-primary/10" : ""}`}
                onClick={() => setUseEnvVars(true)}
              >
                Variáveis de Ambiente
              </Button>
              <Button
                variant="outline"
                type="button"
                className={`${!useEnvVars ? "bg-primary/10" : ""}`}
                onClick={() => setUseEnvVars(false)}
              >
                Inserir Manualmente
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                {useEnvVars
                  ? "Usando ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN do servidor"
                  : "Insira as credenciais da sua instância Z-API abaixo"
                }
              </p>
            </div>
          </div>

          {!useEnvVars && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="instanceId" className="text-right">
                  Instance ID
                </Label>
                <Input
                  id="instanceId"
                  placeholder="Ex: 3DF871A7..."
                  className="col-span-3"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="token" className="text-right">
                  Token
                </Label>
                <Input
                  id="token"
                  placeholder="Ex: A4E42029..."
                  className="col-span-3"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientToken" className="text-right">
                  Client Token
                </Label>
                <Input
                  id="clientToken"
                  placeholder="Ex: Fa427b12e188..."
                  className="col-span-3"
                  value={clientToken}
                  onChange={(e) => setClientToken(e.target.value)}
                />
              </div>
            </>
          )}
          
          {/* Status da Conexão */}
          {channelId && (
            <div className="border rounded-md p-4 mt-2">
              <h4 className="text-sm font-medium mb-2">Status da Conexão</h4>
              
              <div className="flex items-center mb-4">
                {connectionStatus === "connected" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                    <span>WhatsApp conectado</span>
                  </>
                ) : connectionStatus === "waiting_scan" ? (
                  <>
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin mr-2" />
                    <span>Aguardando escaneamento do QR Code</span>
                  </>
                ) : connectionStatus === "error" ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span>Erro na conexão</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-neutral-500 mr-2" />
                    <span>Desconectado</span>
                  </>
                )}
              </div>
              
              {/* QR Code */}
              {qrCodeData && connectionStatus === "waiting_scan" && (
                <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-white">
                  <p className="text-sm text-center mb-2">
                    Escaneie o QR Code abaixo com seu WhatsApp para conectar:
                  </p>
                  <img 
                    src={qrCodeData} 
                    alt="QR Code para WhatsApp" 
                    className="w-48 h-48 mb-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    O QR Code expira em 20 segundos. Se expirar, clique em "Obter QR Code" novamente.
                  </p>
                </div>
              )}
              
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleTestConnection()}
                  disabled={isTestingConnection || isLoading}
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Testar Conexão
                </Button>
                
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGetQRCode}
                  disabled={isTestingConnection || isLoading}
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Obter QR Code
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {connectionStatus === "connected" ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button 
            type="button" 
            onClick={handleSaveChannel}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {existingChannel ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}