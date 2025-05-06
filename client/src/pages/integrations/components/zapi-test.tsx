import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

/**
 * Componente para testar a conexão com as instâncias Z-API
 */
export function ZAPITestPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Testar conexão com as instâncias Z-API
  const testZAPIInstances = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest<any>(
        'GET',
        '/api/test-zapi-instances',
        null
      );
      
      console.log("Resultado do teste Z-API:", response);
      setTestResults(response);
      
      // Mostrar toast com o resultado
      if (response.webInstance.success || response.mobileInstance.success) {
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

  // Formatar mensagem de erro para exibição
  const formatErrorMessage = (result: any) => {
    if (!result) return 'Informação não disponível';
    
    if (result.success) {
      return result.message || 'Conectado com sucesso';
    } else {
      return result.message || 'Erro de conexão';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Teste de Instâncias Z-API</CardTitle>
        <CardDescription>
          Verifique a conectividade com as instâncias Z-API configuradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {testResults && (
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium">Instância Web</h3>
              <div className="flex items-center mt-2">
                {testResults.webInstance.success ? (
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
              <p className="text-sm mt-2">
                {formatErrorMessage(testResults.webInstance)}
              </p>
              {testResults.webInstance.data && (
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(testResults.webInstance.data, null, 2)}
                </pre>
              )}
            </div>

            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium">Instância Mobile</h3>
              <div className="flex items-center mt-2">
                {testResults.mobileInstance.success ? (
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
              <p className="text-sm mt-2">
                {formatErrorMessage(testResults.mobileInstance)}
              </p>
              {testResults.mobileInstance.data && (
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(testResults.mobileInstance.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {!testResults && !isLoading && (
          <div className="text-center py-6 text-gray-500">
            Clique no botão abaixo para testar a conectividade
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
          Testar Instâncias Z-API
        </Button>
      </CardFooter>
    </Card>
  );
}