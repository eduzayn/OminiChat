import React, { useState, useEffect } from "react";
import axios from "axios";

// Componentes UI
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { 
  Button 
} from "@/components/ui/button";
import { 
  Input 
} from "@/components/ui/input";
import { 
  Label 
} from "@/components/ui/label";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  AlertCircle, 
  CheckCircle, 
  Info,
  QrCode,
  RotateCw,
  Send,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Função para extrair o ID da instância de uma URL
 */
function extractInstanceId(input: string): string {
  // Se estiver vazio, retornar vazio
  if (!input) return "";
  
  // Se já for um ID limpo (apenas hexadecimal de 32 caracteres), retorne-o
  if (/^[A-F0-9]{32}$/i.test(input)) {
    return input;
  }
  
  // Verificar se é uma URL ou um caminho
  if (input.includes('http') || input.includes('/')) {
    // Tentar extrair da URL usando expressão regular
    // Procura por padrões como: /instances/XXXXXXXXXXX/token/
    const instanceMatch = input.match(/\/instances\/([A-F0-9]{32})(?:\/|$)/i);
    if (instanceMatch && instanceMatch[1]) {
      return instanceMatch[1];
    }
    
    // Alternativa: procurar qualquer sequência de 32 caracteres hexadecimais
    const hexMatch = input.match(/([A-F0-9]{32})/i);
    if (hexMatch && hexMatch[1]) {
      return hexMatch[1];
    }
  }
  
  // Se não conseguir extrair, retornar o input original
  return input;
}

/**
 * Função para extrair o token da instância de uma URL
 */
function extractToken(input: string): string {
  // Se estiver vazio, retornar vazio
  if (!input) return "";
  
  // Verificar se é uma URL com token
  if (input.includes('/token/')) {
    // Tenta extrair o token após "/token/"
    const tokenMatch = input.match(/\/token\/([A-Za-z0-9]+)/i);
    if (tokenMatch && tokenMatch[1]) {
      return tokenMatch[1];
    }
  }
  
  // Retorna o input original se não encontrar token
  return input;
}

/**
 * Componente de configuração da Z-API
 */
export function ZAPIConfig() {
  const { toast } = useToast();
  
  // Estados para URL, ID da instância e token
  const [apiUrl, setApiUrl] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  
  // Efeito para extrair ID da instância e token da URL
  useEffect(() => {
    if (apiUrl) {
      const extractedId = extractInstanceId(apiUrl);
      const extractedToken = extractToken(apiUrl);
      
      // Atualizar os campos apenas se forem diferentes
      if (extractedId && extractedId !== instanceId) {
        setInstanceId(extractedId);
      }
      
      if (extractedToken && extractedToken !== token) {
        setToken(extractedToken);
      }
    }
  }, [apiUrl]);
  
  // Função para testar a extração
  const testExtraction = async () => {
    try {
      setExtractionResult(null);
      
      const localExtractedId = extractInstanceId(apiUrl);
      const localExtractedToken = extractToken(apiUrl);
      
      // Testa a extração no backend
      const response = await axios.post("/api/zapi/extract-id", {
        input: apiUrl
      });
      
      setExtractionResult({
        local: {
          raw_input: apiUrl,
          extracted_id: localExtractedId,
          extracted_token: localExtractedToken
        },
        server: response.data
      });
      
      toast({
        title: "Extração concluída",
        description: "Informações extraídas com sucesso. Verifique os resultados abaixo.",
        variant: "default"
      });
    } catch (error) {
      console.error("Erro ao testar extração:", error);
      toast({
        title: "Erro ao extrair informações",
        description: "Não foi possível extrair as informações da URL fornecida.",
        variant: "destructive"
      });
    }
  };
  
  // Função para testar a conexão com a Z-API
  const testConnection = async () => {
    try {
      setTestResult(null);
      setTestStatus("loading");
      
      const response = await axios.post("/api/zapi/test-connection", {
        instanceId: instanceId,
        token: token
      });
      
      setTestResult(response.data);
      setTestStatus(response.data.success ? "success" : "error");
      
      toast({
        title: response.data.success ? "Conexão bem-sucedida" : "Erro na conexão",
        description: response.data.success 
          ? "Conexão com a Z-API estabelecida com sucesso." 
          : "Falha ao conectar com a Z-API. Verifique as credenciais.",
        variant: response.data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      setTestStatus("error");
      setTestResult({
        success: false,
        error: "Erro na requisição"
      });
      
      toast({
        title: "Erro na requisição",
        description: "Não foi possível testar a conexão com a Z-API.",
        variant: "destructive"
      });
    }
  };
  
  // Função para obter QR Code
  const getQRCode = async () => {
    try {
      setQrCode(null);
      setQrCodeLoading(true);
      
      const response = await axios.get("/api/zapi/qrcode");
      
      if (response.data.success && response.data.qrcode && response.data.qrcode.qrcode) {
        setQrCode(response.data.qrcode.qrcode);
        toast({
          title: "QR Code obtido",
          description: "Escaneie o QR Code com o WhatsApp para conectar.",
          variant: "default"
        });
      } else {
        toast({
          title: "Erro ao obter QR Code",
          description: "Não foi possível obter o QR Code. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao obter QR Code:", error);
      toast({
        title: "Erro ao obter QR Code",
        description: "Não foi possível obter o QR Code. Verifique as credenciais.",
        variant: "destructive"
      });
    } finally {
      setQrCodeLoading(false);
    }
  };
  
  // Função para reiniciar a conexão
  const restartConnection = async () => {
    try {
      const response = await axios.post("/api/zapi/restart");
      
      if (response.data.success) {
        toast({
          title: "Conexão reiniciada",
          description: "A conexão com o WhatsApp foi reiniciada com sucesso.",
          variant: "default"
        });
      } else {
        toast({
          title: "Erro ao reiniciar",
          description: "Não foi possível reiniciar a conexão com o WhatsApp.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao reiniciar conexão:", error);
      toast({
        title: "Erro ao reiniciar",
        description: "Não foi possível reiniciar a conexão com o WhatsApp.",
        variant: "destructive"
      });
    }
  };
  
  // Função para verificar status
  const checkStatus = async () => {
    try {
      setTestResult(null);
      setTestStatus("loading");
      
      const response = await axios.get("/api/zapi/status");
      
      if (response.data.success) {
        setTestResult({
          success: true,
          status: response.data.status
        });
        setTestStatus("success");
        
        toast({
          title: "Status verificado",
          description: response.data.status.connected 
            ? "WhatsApp conectado e pronto para uso!" 
            : "WhatsApp não está conectado. Obtenha um QR Code para conectar.",
          variant: "default"
        });
      } else {
        setTestResult({
          success: false,
          error: "Erro ao verificar status"
        });
        setTestStatus("error");
        
        toast({
          title: "Erro ao verificar status",
          description: "Não foi possível verificar o status da conexão.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setTestStatus("error");
      setTestResult({
        success: false,
        error: "Erro na requisição"
      });
      
      toast({
        title: "Erro ao verificar status",
        description: "Não foi possível verificar o status da conexão.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração da Z-API</CardTitle>
          <CardDescription>
            Configure a integração com o WhatsApp através da Z-API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="url">URL da API</TabsTrigger>
              <TabsTrigger value="manual">Configuração Manual</TabsTrigger>
              <TabsTrigger value="status">Status e QR Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="url">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">
                    URL Completa da API
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 inline-block ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Cole a URL completa da API exatamente como mostrada no painel da Z-API. 
                            Exemplo: https://api.z-api.io/instances/ABCDEF123456/token/TOKEN123/send-text
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="api-url"
                    placeholder="https://api.z-api.io/instances/..."
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500">
                    Cole a URL completa da API, incluindo ID da instância e token.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button onClick={testExtraction}>
                    Extrair Informações
                  </Button>
                </div>
                
                {extractionResult && (
                  <Alert className={extractionResult.server?.success ? "bg-green-50" : "bg-red-50"}>
                    <AlertCircle className="h-4 w-4 mt-1" />
                    <AlertTitle>Resultado da Extração</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-2">
                        <div>
                          <strong>ID da Instância:</strong> {extractionResult.server?.extracted_id}
                        </div>
                        <div>
                          <strong>Token:</strong> {extractionResult.local?.extracted_token}
                        </div>
                        <div>
                          <strong>Formato Válido:</strong> {extractionResult.server?.is_valid_format ? "Sim" : "Não"}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="manual">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instance-id">
                    ID da Instância
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 inline-block ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            ID único da sua instância na Z-API (32 caracteres hexadecimais).
                            Exemplo: 3DF871A7ADFB20FB49998E66062CE0C1
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="instance-id"
                    placeholder="ID da Instância (32 caracteres)"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="token">
                    Token
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 inline-block ml-2 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Token de acesso fornecido pela Z-API.
                            Exemplo: A4E42029C248B72DA0842F47
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="token"
                    placeholder="Token de autenticação"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="pt-2">
                  <Button onClick={testConnection} disabled={!instanceId || !token || testStatus === "loading"}>
                    {testStatus === "loading" ? "Testando..." : "Testar Conexão"}
                  </Button>
                </div>
                
                {testStatus !== "idle" && testResult && (
                  <Alert className={testStatus === "success" ? "bg-green-50" : "bg-red-50"}>
                    {testStatus === "success" ? (
                      <CheckCircle className="h-4 w-4 mt-1 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-1 text-red-500" />
                    )}
                    <AlertTitle>
                      {testStatus === "success" ? "Conexão bem-sucedida" : "Erro na conexão"}
                    </AlertTitle>
                    <AlertDescription>
                      {testStatus === "success" ? (
                        <div className="mt-2">
                          <p>Conectado com sucesso à Z-API.</p>
                          {testResult.status?.connected ? (
                            <p className="text-green-600 font-semibold mt-1">
                              WhatsApp conectado e pronto para uso!
                            </p>
                          ) : (
                            <p className="text-amber-600 font-semibold mt-1">
                              WhatsApp não está conectado. Obtenha um QR Code para conectar.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p>Não foi possível conectar à Z-API. Verifique as credenciais.</p>
                          {testResult.error?.message && (
                            <p className="text-red-600 mt-1">
                              Erro: {testResult.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="status">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={checkStatus} className="gap-2">
                    <Settings size={16} />
                    Verificar Status
                  </Button>
                  
                  <Button onClick={getQRCode} className="gap-2" disabled={qrCodeLoading}>
                    <QrCode size={16} />
                    {qrCodeLoading ? "Obtendo QR Code..." : "Obter QR Code"}
                  </Button>
                  
                  <Button onClick={restartConnection} variant="outline" className="gap-2">
                    <RotateCw size={16} />
                    Reiniciar Conexão
                  </Button>
                </div>
                
                {testStatus !== "idle" && testResult && (
                  <Alert className={testStatus === "success" ? "bg-green-50" : "bg-red-50"}>
                    {testStatus === "success" ? (
                      <CheckCircle className="h-4 w-4 mt-1 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-1 text-red-500" />
                    )}
                    <AlertTitle>
                      Status da Conexão
                    </AlertTitle>
                    <AlertDescription>
                      {testStatus === "success" ? (
                        <div className="mt-2">
                          {testResult.status?.connected ? (
                            <p className="text-green-600 font-semibold">
                              WhatsApp conectado e pronto para uso!
                            </p>
                          ) : (
                            <p className="text-amber-600 font-semibold">
                              WhatsApp não está conectado. Obtenha um QR Code para conectar.
                            </p>
                          )}
                          <div className="mt-2">
                            <strong>Detalhes:</strong>
                            <pre className="mt-1 bg-gray-50 p-2 rounded-md text-xs overflow-auto">
                              {JSON.stringify(testResult.status, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p>Não foi possível verificar o status da conexão.</p>
                          {testResult.error?.message && (
                            <p className="text-red-600 mt-1">
                              Erro: {testResult.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {qrCode && (
                  <div className="bg-white p-4 rounded-md border">
                    <h3 className="text-lg font-semibold mb-2">QR Code para Conexão</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Escaneie este QR Code com o WhatsApp para conectar o número à instância.
                    </p>
                    <div className="flex justify-center">
                      <img
                        src={qrCode}
                        alt="QR Code para conectar WhatsApp"
                        className="max-w-full h-auto"
                        style={{ maxWidth: "300px" }}
                      />
                    </div>
                    <p className="text-sm text-center mt-4 text-amber-600">
                      O QR Code expira rapidamente. Se não funcionar, gere um novo.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          <p className="text-sm text-gray-500">
            Para obter as credenciais da Z-API, acesse o painel administrativo em{" "}
            <a 
              href="https://app.z-api.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://app.z-api.io/
            </a>
          </p>
        </CardFooter>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enviar mensagem de teste</CardTitle>
          <CardDescription>
            Teste o envio de mensagens pelo WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const phone = formData.get("phone") as string;
            const message = formData.get("message") as string;
            
            if (phone && message) {
              axios.post("/api/zapi/send-text", { phone, message })
                .then((response) => {
                  if (response.data.success) {
                    toast({
                      title: "Mensagem enviada",
                      description: "A mensagem foi enviada com sucesso.",
                      variant: "default"
                    });
                  } else {
                    toast({
                      title: "Erro ao enviar mensagem",
                      description: "Não foi possível enviar a mensagem.",
                      variant: "destructive"
                    });
                  }
                })
                .catch((error) => {
                  console.error("Erro ao enviar mensagem:", error);
                  toast({
                    title: "Erro ao enviar mensagem",
                    description: "Não foi possível enviar a mensagem.",
                    variant: "destructive"
                  });
                });
            } else {
              toast({
                title: "Dados incompletos",
                description: "Telefone e mensagem são obrigatórios.",
                variant: "destructive"
              });
            }
          }}>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefone
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 inline-block ml-2 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Formato: Código do país + DDD + número, sem espaços ou caracteres especiais.
                        Exemplo para Brasil: 5511999998888
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="phone"
                name="phone"
                placeholder="5511999998888"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <textarea
                id="message"
                name="message"
                placeholder="Digite sua mensagem de teste"
                className="w-full min-h-24 p-2 border rounded-md"
              />
            </div>
            
            <Button type="submit" className="gap-2">
              <Send size={16} />
              Enviar Mensagem
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}