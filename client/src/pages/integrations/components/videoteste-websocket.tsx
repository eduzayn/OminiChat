import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/context/socket-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ReloadIcon, CheckCircle, XCircle, InfoIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  results?: any[];
  error?: any;
  responseData?: any;
}

// URLs de vídeos para teste
const TEST_VIDEOS = [
  {
    title: "Vídeo de exemplo pequeno (MP4)",
    url: "https://www.sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4",
    description: "Arquivo pequeno (1MB) para testes rápidos"
  },
  {
    title: "Vídeo de exemplo médio (MP4)",
    url: "https://www.sample-videos.com/video123/mp4/240/big_buck_bunny_240p_10mb.mp4",
    description: "Arquivo médio (10MB) para testes de performance"
  },
  {
    title: "Vídeo de exemplo grande (MP4)",
    url: "https://www.sample-videos.com/video123/mp4/240/big_buck_bunny_240p_30mb.mp4",
    description: "Arquivo grande (30MB) para testar limites de tamanho"
  }
];

export default function VideoTesteWebSocket() {
  const { connected, sendMessage, addListener } = useSocket();
  
  const [phoneNumber, setPhoneNumber] = useState("553798694620");
  const [videoUrl, setVideoUrl] = useState(TEST_VIDEOS[0].url);
  const [caption, setCaption] = useState("Teste de envio de vídeo via WebSocket");
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  // Montar listener de WebSocket para receber resultados de testes
  useEffect(() => {
    // Verificar conexão do WebSocket antes de adicionar listener
    if (!connected) {
      return () => {};
    }
    
    // Listener para resultados do teste direto Z-API
    const removeDirectTestListener = addListener("zapiDirectTestResult", (data: any) => {
      console.log("Recebido resultado de teste direto da Z-API:", data);
      setTestResult(data);
      setLoading(false);
    });
    
    // Listener para resultados do teste de envio de vídeo
    const removeVideoTestListener = addListener("zapiSendVideoResult", (data: any) => {
      console.log("Recebido resultado de teste de envio de vídeo:", data);
      setTestResult(data);
      setLoading(false);
    });
    
    // Remover listeners quando o componente for desmontado
    return () => {
      removeDirectTestListener();
      removeVideoTestListener();
    };
  }, [connected, addListener]);
  
  // Função para testar conexão direta Z-API
  const handleTestConnection = useCallback(() => {
    if (!connected) {
      alert("WebSocket não está conectado. Aguarde a conexão ser estabelecida.");
      return;
    }
    
    setLoading(true);
    setTestResult(null);
    
    console.log("Enviando solicitação de teste direto Z-API...");
    sendMessage("zapiDirectTest", {});
  }, [connected, sendMessage]);
  
  // Função para testar envio de vídeo
  const handleSendVideo = useCallback(() => {
    if (!connected) {
      alert("WebSocket não está conectado. Aguarde a conexão ser estabelecida.");
      return;
    }
    
    if (!phoneNumber || !videoUrl) {
      alert("Preencha o número de telefone e a URL do vídeo");
      return;
    }
    
    setLoading(true);
    setTestResult(null);
    
    console.log("Enviando solicitação de teste de vídeo...");
    sendMessage("zapiSendVideo", {
      to: phoneNumber,
      videoUrl,
      caption
    });
  }, [connected, sendMessage, phoneNumber, videoUrl, caption]);
  
  // Renderizar o status da conexão
  const renderConnectionStatus = () => {
    if (connected) {
      return (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-700">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Conectado</AlertTitle>
          <AlertDescription>WebSocket conectado e pronto para testes.</AlertDescription>
        </Alert>
      );
    } else {
      return (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-700">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle>Desconectado</AlertTitle>
          <AlertDescription>Aguarde a conexão do WebSocket ou atualize a página.</AlertDescription>
        </Alert>
      );
    }
  };
  
  // Renderizar os resultados do teste
  const renderTestResult = () => {
    if (!testResult) return null;
    
    const resultStyle = testResult.success 
      ? "border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-700" 
      : "border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-700";
    
    const icon = testResult.success 
      ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      : <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    
    return (
      <div className="mt-4">
        <Alert className={resultStyle}>
          {icon}
          <AlertTitle>{testResult.success ? "Sucesso" : "Erro"}</AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
        
        {testResult.results && testResult.results.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Métodos testados:</h3>
            
            <Accordion type="single" collapsible className="w-full">
              {testResult.results.map((result, index) => (
                <AccordionItem key={index} value={`method-${index}`}>
                  <AccordionTrigger className={result.success ? "text-green-600" : "text-red-600"}>
                    {result.method} - {result.success ? "Sucesso" : "Falha"}
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-60">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
        
        {testResult.responseData && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Dados da resposta:</h3>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-60">
              {JSON.stringify(testResult.responseData, null, 2)}
            </pre>
          </div>
        )}
        
        {testResult.error && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Detalhes do erro:</h3>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-60">
              {JSON.stringify(testResult.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };
  
  // Adicionar uma opção para selecionar vídeos de exemplo
  const renderVideoSelector = () => (
    <div className="mt-4">
      <Label htmlFor="video-select" className="mb-2 block">Selecione um vídeo de exemplo:</Label>
      <select 
        id="video-select"
        className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
        onChange={(e) => {
          const selected = TEST_VIDEOS.find(v => v.url === e.target.value);
          if (selected) {
            setVideoUrl(selected.url);
            // Atualizar a legenda com informações do vídeo
            setCaption(`Teste: ${selected.title} - ${selected.description}`);
          }
        }}
        value={videoUrl}
      >
        {TEST_VIDEOS.map((video, index) => (
          <option key={index} value={video.url}>
            {video.title}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        {TEST_VIDEOS.find(v => v.url === videoUrl)?.description || ""}
      </p>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Envio de Vídeo via WebSocket</CardTitle>
        <CardDescription>
          Teste o envio de vídeos para WhatsApp usando a API Z-API via WebSocket, que oferece diagnóstico detalhado.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {renderConnectionStatus()}
        
        <Tabs defaultValue="envio-video" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="envio-video">Enviar Vídeo</TabsTrigger>
            <TabsTrigger value="teste-api">Testar API</TabsTrigger>
          </TabsList>
          
          <TabsContent value="envio-video" className="space-y-4">
            <div className="grid gap-4 mt-4">
              <div>
                <Label htmlFor="phone-number">Número de telefone:</Label>
                <Input
                  id="phone-number"
                  placeholder="553798694620"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Formato: DDI + DDD + Número (ex: 553798694620)</p>
              </div>
              
              {renderVideoSelector()}
              
              <div>
                <Label htmlFor="video-url">URL do vídeo:</Label>
                <Input
                  id="video-url"
                  placeholder="https://exemplo.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">URL pública direta para o arquivo MP4</p>
              </div>
              
              <div>
                <Label htmlFor="caption">Legenda:</Label>
                <Textarea
                  id="caption"
                  placeholder="Legenda opcional para o vídeo"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              className="w-full mt-4" 
              onClick={handleSendVideo}
              disabled={loading || !connected}
            >
              {loading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : "Enviar Vídeo"}
            </Button>
          </TabsContent>
          
          <TabsContent value="teste-api">
            <div className="space-y-4 mt-4">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Informação</AlertTitle>
                <AlertDescription>
                  Este teste verifica a conectividade básica com a API Z-API usando as credenciais configuradas.
                </AlertDescription>
              </Alert>
              
              <Button 
                className="w-full" 
                onClick={handleTestConnection}
                disabled={loading || !connected}
                variant="outline"
              >
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : "Testar Conexão com API"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {renderTestResult()}
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-gray-500">
          Timestamp: {new Date().toISOString()}
        </div>
        <div className="text-xs text-gray-500">
          WebSocket: {connected ? "Conectado" : "Desconectado"}
        </div>
      </CardFooter>
    </Card>
  );
}