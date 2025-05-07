import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw, Link, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type WebhookDiagnosticProps = {
  channelId: number;
  onDiagnosticComplete?: () => void;
};

type DiagnosticReport = {
  channelId: number;
  channelName: string;
  connectionStatus: {
    connected: boolean;
    status: string;
    message: string;
  };
  webhookInitialStatus: {
    configured: boolean;
    status: string;
    message: string;
    webhookUrl: string | null;
  };
  webhookReconfiguration: {
    success: boolean;
    message: string;
    webhookUrl: string | null;
  };
  webhookFinalStatus: {
    configured: boolean;
    status: string;
    message: string;
    webhookUrl: string | null;
  };
  channelMetadata: {
    lastWebhookReceived: string | null;
    webhookReceiveCount: number;
    lastWebhookSetup: string | null;
  };
  recommendation: string;
};

const ZAPIDiagnosticPanel: React.FC<WebhookDiagnosticProps> = ({ channelId, onDiagnosticComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const { toast } = useToast();

  const runDiagnostic = async () => {
    try {
      setIsRunning(true);
      setReport(null);
      
      const response = await apiRequest('POST', `/api/channels/${channelId}/diagnose-webhook`, null);
      
      if (response.success && response.diagnosticReport) {
        setReport(response.diagnosticReport);
        
        // Notificar usuário com base no resultado
        if (!response.diagnosticReport.connectionStatus.connected) {
          toast({
            title: "Problema de conexão detectado",
            description: "O dispositivo não está conectado ao WhatsApp. Escaneie o QR Code para conectar.",
            variant: "destructive"
          });
        } else if (!response.diagnosticReport.webhookFinalStatus.configured) {
          toast({
            title: "Problema com webhook detectado",
            description: "O webhook não pôde ser configurado corretamente. Verifique as credenciais Z-API.",
            variant: "destructive"
          });
        } else if (response.diagnosticReport.channelMetadata.webhookReceiveCount === 0) {
          toast({
            title: "Webhook configurado, mas sem mensagens",
            description: "O webhook foi configurado, mas ainda não recebeu nenhuma mensagem. Envie uma mensagem de teste.",
            variant: "default"
          });
        } else {
          toast({
            title: "Diagnóstico concluído",
            description: "O webhook está configurado e funcionando corretamente.",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Erro no diagnóstico",
          description: "Não foi possível completar o diagnóstico de webhook.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao executar diagnóstico:", error);
      toast({
        title: "Erro no diagnóstico",
        description: "Ocorreu um erro ao diagnosticar o webhook.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      if (onDiagnosticComplete) onDiagnosticComplete();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico de Webhook</CardTitle>
        <CardDescription>
          Verifique e corrija problemas de configuração do webhook para recebimento de mensagens
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!report ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            {isRunning ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Executando diagnóstico completo...</p>
                <p className="text-sm text-muted-foreground">
                  Verificando conexão, status do webhook e realizando testes...
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-primary" />
                <p className="text-lg font-medium">Diagnóstico de webhook</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  O diagnóstico verificará a conexão com o WhatsApp, configuração de webhook
                  e tentará resolver problemas automaticamente.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Alert variant={report.connectionStatus.connected ? "default" : "destructive"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>
                Status da Conexão: {report.connectionStatus.connected ? "Conectado" : "Desconectado"}
              </AlertTitle>
              <AlertDescription>{report.connectionStatus.message}</AlertDescription>
            </Alert>
            
            <Alert variant={report.webhookFinalStatus.configured ? "default" : "destructive"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>
                Status do Webhook: {report.webhookFinalStatus.configured ? "Configurado" : "Não Configurado"}
              </AlertTitle>
              <AlertDescription>{report.webhookFinalStatus.message}</AlertDescription>
            </Alert>
            
            {report.webhookFinalStatus.webhookUrl && (
              <div className="flex items-center space-x-2 text-sm p-2 bg-muted rounded">
                <Link className="h-4 w-4" />
                <span className="font-medium">URL do Webhook:</span>
                <code className="bg-muted-foreground/20 px-2 py-1 rounded text-xs break-all">
                  {report.webhookFinalStatus.webhookUrl}
                </code>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mensagens Recebidas:</span>
                <Badge variant={report.channelMetadata.webhookReceiveCount > 0 ? "secondary" : "destructive"}>
                  {report.channelMetadata.webhookReceiveCount}
                </Badge>
              </div>
              
              {report.channelMetadata.lastWebhookReceived && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Última Mensagem Recebida:</span>
                  <span className="text-sm">
                    {new Date(report.channelMetadata.lastWebhookReceived).toLocaleString()}
                  </span>
                </div>
              )}
              
              {report.channelMetadata.lastWebhookSetup && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Última Configuração:</span>
                  <span className="text-sm">
                    {new Date(report.channelMetadata.lastWebhookSetup).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h3 className="font-medium">Recomendação:</h3>
              <p className="text-sm">{report.recommendation}</p>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="details">
                <AccordionTrigger>Ver Detalhes Técnicos</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-xs">
                    <div>
                      <h4 className="font-medium">Status Inicial do Webhook:</h4>
                      <p>{report.webhookInitialStatus.message}</p>
                      {report.webhookInitialStatus.webhookUrl && (
                        <p className="break-all">URL: {report.webhookInitialStatus.webhookUrl}</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Reconfiguração do Webhook:</h4>
                      <p>Status: {report.webhookReconfiguration.success ? "Sucesso" : "Falha"}</p>
                      <p>{report.webhookReconfiguration.message}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Status Final do Webhook:</h4>
                      <p>{report.webhookFinalStatus.message}</p>
                      {report.webhookFinalStatus.webhookUrl && (
                        <p className="break-all">URL: {report.webhookFinalStatus.webhookUrl}</p>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setReport(null)}
          disabled={isRunning || !report}
        >
          Limpar
        </Button>
        <Button 
          onClick={runDiagnostic} 
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {report ? "Executar Novamente" : "Iniciar Diagnóstico"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ZAPIDiagnosticPanel;