import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Check, AlertCircle } from "lucide-react";

/**
 * Componente de diagnóstico Z-API para verificar o status da conexão
 */
export function ZAPIDiagnosticPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("status");

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
          title: 'Diagnóstico concluído',
          description: 'Conexão com a Z-API está funcionando corretamente.',
        });
      } else {
        toast({
          title: 'Diagnóstico concluído',
          description: 'Problemas detectados na conexão com a Z-API.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erro ao testar instâncias Z-API:", error);
      toast({
        title: 'Erro',
        description: 'Falha ao realizar diagnóstico Z-API.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="status" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="status">Status</TabsTrigger>
        <TabsTrigger value="diagnostic">Diagnóstico Completo</TabsTrigger>
      </TabsList>
      
      <TabsContent value="status" className="space-y-4">
        <div className="bg-blue-50 rounded-md p-4 mt-4">
          <h3 className="text-md font-medium text-blue-800 mb-2">Verificação de Status</h3>
          <p className="text-sm text-blue-700">
            Verifique se os serviços Z-API estão conectados e funcionando corretamente.
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={testZAPIInstances}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verificar Conexão
          </Button>
        </div>
        
        {testResults && testResults.zapiConnectionTest && (
          <Card>
            <CardHeader>
              <CardTitle>Status da Conexão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-medium">Instância Web</span>
                  {testResults.zapiConnectionTest.webInstance?.success ? (
                    <div className="flex items-center text-green-600">
                      <Check className="h-5 w-5 mr-2" />
                      <span>Conectada</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Desconectada</span>
                    </div>
                  )}
                </div>
                
                {testResults.environmentVariables && (
                  <div className="border-b pb-2">
                    <h3 className="font-medium mb-2">Variáveis de Ambiente</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-neutral-600">ZAPI_TOKEN:</div>
                      <div>{testResults.environmentVariables.ZAPI_TOKEN}</div>
                      <div className="text-neutral-600">ZAPI_INSTANCE_ID:</div>
                      <div>{testResults.environmentVariables.ZAPI_INSTANCE_ID}</div>
                      <div className="text-neutral-600">Client-Token:</div>
                      <div>{testResults.environmentVariables.CLIENT_TOKEN_ZAPI || testResults.environmentVariables.ZAPI_CLIENT_TOKEN || "Não definido"}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      
      <TabsContent value="diagnostic">
        <Card className="w-full mt-4">
          <CardHeader>
            <CardTitle>Diagnóstico Detalhado</CardTitle>
            <CardDescription>
              Verificação completa da configuração Z-API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults && (
              <div className="space-y-4 text-sm">
                {testResults.zapiChannels && testResults.zapiChannels.length > 0 && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-md font-medium mb-2">Canais Z-API ({testResults.zapiChannelsCount})</h3>
                    <div className="space-y-2">
                      {testResults.zapiChannels.map((channel: any, index: number) => (
                        <div key={index} className="border-b last:border-b-0 pb-2 last:pb-0">
                          <div className="flex justify-between">
                            <span className="font-medium">{channel.name} (ID: {channel.id})</span>
                            <span className={channel.isActive ? "text-green-600" : "text-red-600"}>
                              {channel.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {testResults.zapiConnectionTest && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-md font-medium mb-2">Resposta da API Z-API</h3>
                    <div className="bg-neutral-50 p-2 rounded text-xs font-mono overflow-auto max-h-[200px]">
                      <pre>
                        {JSON.stringify(testResults.zapiConnectionTest.webInstance?.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!testResults && !isLoading && (
              <div className="text-center py-6 text-gray-500">
                Clique no botão abaixo para executar o diagnóstico completo
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
              Executar Diagnóstico Completo
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}