import React, { useState, useEffect } from 'react';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, QrCode, Loader2, RefreshCcw, AlertCircle, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { 
  IntegrationConfigDialog, 
  IntegrationTabs, 
  IntegrationTabContent 
} from './integration-config-dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Schema de validação para configuração da Z-API
const zapiConfigSchema = z.object({
  instanceId: z.string()
    .min(1, "O ID da instância é obrigatório"),
  token: z.string()
    .min(1, "O token é obrigatório"),
  phone: z.string()
    .min(1, "O telefone é obrigatório")
});

type ZAPIConfigFormValues = z.infer<typeof zapiConfigSchema>;

// Componente para o QR Code do WhatsApp
function WhatsAppQRCode({ channelId }: { channelId: number }) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQRCode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Realizando GET para /api/channels/${channelId}/qrcode`);
      const data = await apiRequest<{
        qrcode?: string; 
        qrCode?: string; 
        status?: string; 
        message?: string; 
        success?: boolean; 
        connected?: boolean;
        error_code?: string;
        details?: string;
        recommendations?: string[];
        technical_info?: Record<string, any>;
      }>("GET", `/api/channels/${channelId}/qrcode`);
      
      console.log("Resposta da API de QR Code:", data);
      
      // Verificar se o canal já está conectado
      if (data.connected || data.status === 'connected') {
        setStatus('connected');
        setQrCode(null);
        toast({
          title: "WhatsApp Conectado",
          description: "Este dispositivo já está conectado ao WhatsApp.",
          variant: "default"
        });
        return;
      }
      
      // Verificar se temos um QR Code (pode estar em data.qrcode ou data.qrCode)
      const qrcodeData = data.qrcode || data.qrCode;
      
      if (qrcodeData) {
        console.log("QR Code obtido com sucesso");
        setQrCode(qrcodeData);
        setStatus(data.status || 'waiting');
      } else {
        console.error("QR Code não encontrado na resposta:", data);
        
        // Construir mensagem de erro detalhada
        let errorDetails = '';
        let errorTitle = '';
        let errorVariant: "default" | "destructive" = "destructive";
        
        if (data.details) {
          errorDetails += data.details;
        }
        
        if (data.recommendations && data.recommendations.length > 0) {
          errorDetails += '\n\nRecomendações:\n';
          data.recommendations.forEach((rec, i) => {
            errorDetails += `${i+1}. ${rec}\n`;
          });
        }
        
        if (data.error_code) {
          errorDetails += `\n\nCódigo do erro: ${data.error_code}`;
          
          // Configurar mensagens personalizadas para códigos de erro conhecidos
          if (data.error_code === 'NOT_FOUND') {
            errorTitle = "Credenciais da Z-API inválidas";
            errorDetails += `\n\nEste erro indica que a API da Z-API não reconheceu sua instância. Verifique se as credenciais estão corretas no painel da Z-API.`;
          } else if (data.error_code === 'API_COMPATIBILITY_ERROR') {
            errorTitle = "Problema de compatibilidade com a API";
            errorDetails += `\n\nEste erro indica um problema de compatibilidade com a API. Verifique a versão da sua Z-API e as URLs suportadas.`;
          } else if (data.error_code === 'INVALID_CREDENTIALS') {
            errorTitle = "Credenciais da Z-API inválidas";
            errorDetails += `\n\nAs credenciais fornecidas (instanceId e token) parecem ser inválidas ou a instância não existe.`;
          } else if (data.error_code === 'STATUS_CHECK_FAILED') {
            errorTitle = "Falha na verificação de status";
            errorDetails += `\n\nNão foi possível verificar o status da conexão com a Z-API. Pode ser um problema temporário.`;
          } else if (data.error_code === 'QR_CODE_UNAVAILABLE') {
            errorTitle = "QR Code não disponível";
            errorDetails += `\n\nNão foi possível obter o QR Code. Isso pode ocorrer se o dispositivo já estiver conectado ou em processo de conexão.`;
            errorVariant = "default"; // Erro menos crítico
          }
        }
        
        // Tratamento para casos específicos sem error_code
        if (data.connected) {
          errorTitle = "WhatsApp já conectado";
          errorDetails = "O dispositivo já está conectado. Não é necessário escanear o QR Code.";
          errorVariant = "default"; // Não é realmente um erro
        }
        
        // Exibir mensagem de erro com detalhes
        const errorMessage = data.message || 'Não foi possível gerar o QR Code';
        setError(`${errorMessage}${errorDetails ? '\n\n' + errorDetails : ''}`);
        
        toast({
          title: errorTitle || "Erro ao gerar QR Code",
          description: errorMessage,
          variant: errorVariant
        });
      }
    } catch (err: any) {
      console.error('Erro ao obter QR Code:', err);
      
      let errorMessage = 'Erro ao obter o QR Code. Tente novamente.';
      let errorDetails = '';
      
      // Tentar extrair informações detalhadas do erro
      if (err?.message) {
        try {
          // Verificar se a mensagem de erro contém um JSON
          const errMsg = err.message;
          // Encontrar qualquer JSON na mensagem de erro
          let jsonMatch = null;
          if (errMsg.includes('{') && errMsg.includes('}')) {
            const startIndex = errMsg.indexOf('{');
            const endIndex = errMsg.lastIndexOf('}') + 1;
            if (startIndex >= 0 && endIndex > startIndex) {
              jsonMatch = [errMsg.substring(startIndex, endIndex)];
            }
          }
          
          if (jsonMatch) {
            const errorData = JSON.parse(jsonMatch[0]);
            
            // Extrair mensagem principal
            errorMessage = errorData.message || errorMessage;
            
            // Extrair detalhes adicionais
            if (errorData.details) {
              errorDetails += errorData.details;
            }
            
            // Extrair recomendações
            if (errorData.recommendations && errorData.recommendations.length > 0) {
              errorDetails += '\n\nRecomendações:\n';
              errorData.recommendations.forEach((rec: string, i: number) => {
                errorDetails += `${i+1}. ${rec}\n`;
              });
            }
            
            // Informações técnicas específicas para desenvolvedores
            if (errorData.technical_info) {
              const technicalInfo = errorData.technical_info;
              console.log('Informações técnicas do erro:', technicalInfo);
              
              // Adicionar instanceId se disponível
              if (technicalInfo.instanceId) {
                errorDetails += `\n\nInstância: ${technicalInfo.instanceId}`;
              }
              
              // Adicionar URLs testadas
              if (technicalInfo.attempted_urls) {
                errorDetails += `\n\nURLs tentadas: ${technicalInfo.attempted_urls.length}`;
              }
            }
          } else {
            errorMessage = errMsg;
          }
        } catch (parseError) {
          // Se falhar ao analisar JSON, usar mensagem original
          errorMessage = err.message;
        }
      }
      
      // Definir erro completo para exibição
      setError(`${errorMessage}${errorDetails ? '\n\n' + errorDetails : ''}`);
      
      // Mostrar toast com erro
      toast({
        title: "Erro ao obter QR Code",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchQRCode();
    }
  }, [channelId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Gerando QR Code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4 max-w-xl w-full">
          <h3 className="text-red-800 font-medium mb-2">Erro ao conectar WhatsApp</h3>
          <div className="text-gray-700 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto mb-4">
            {error.split('\n').map((line, index) => (
              <div key={index} className="line">
                {line}
              </div>
            ))}
          </div>
          
          {error.includes('credenciais') || error.includes('instanceId') || error.includes('token') ? (
            <div className="bg-yellow-50 p-3 mb-3 rounded border border-yellow-200">
              <p className="text-yellow-800 text-sm font-medium mb-1">Verifique suas credenciais Z-API</p>
              <p className="text-sm">O erro parece estar relacionado às credenciais da Z-API. Verifique se:</p>
              <ul className="list-disc text-sm pl-5 mt-1 text-gray-600">
                <li>O ID da instância está correto e ativo no painel da Z-API</li>
                <li>O token de acesso está correto e não expirou</li>
                <li>Você tem permissões suficientes para esta instância</li>
              </ul>
            </div>
          ) : null}
          
          {error.includes('NOT_FOUND') ? (
            <div className="bg-blue-50 p-3 mb-3 rounded border border-blue-200">
              <p className="text-blue-800 text-sm font-medium mb-1">Problema de compatibilidade de API</p>
              <p className="text-sm">O erro NOT_FOUND geralmente indica problemas de compatibilidade com a API da Z-API. Tente:</p>
              <ul className="list-disc text-sm pl-5 mt-1 text-gray-600">
                <li>Verificar se a instância existe e está ativa no painel da Z-API</li>
                <li>Atualizar o token e ID da instância nos detalhes do canal</li>
                <li>Contatar o suporte da Z-API para verificar se há mudanças nos endpoints</li>
              </ul>
            </div>
          ) : null}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchQRCode} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
          
          <Button 
            variant="default"
            onClick={async () => {
              try {
                toast({
                  title: "Executando diagnóstico...",
                  description: "Verificando a conexão com a Z-API",
                });
                const result = await apiRequest("GET", `/api/channels/${channelId}/status`);
                console.log("Diagnóstico Z-API:", result);
                
                // Mostrar resultado diagnóstico em toast
                const recommendations = result.recommendations || [];
                toast({
                  title: "Diagnóstico Z-API",
                  description: 
                    recommendations.length > 0 
                      ? `${recommendations.length} ${recommendations.length === 1 ? 'recomendação' : 'recomendações'} encontrada${recommendations.length === 1 ? '' : 's'}.`
                      : "Nenhum problema crítico encontrado",
                  variant: recommendations.length > 0 ? "destructive" : "default",
                });
                
                // Se há problemas no diagnóstico, mostrar erro informativo
                if (recommendations.length > 0) {
                  setError(`Diagnóstico Z-API:\n\n${recommendations.join('\n\n')}`);
                }
              } catch (error) {
                console.error("Erro ao executar diagnóstico:", error);
                toast({
                  title: "Erro no diagnóstico",
                  description: "Não foi possível obter diagnóstico da integração",
                  variant: "destructive"
                });
              }
            }}
          >
            Diagnóstico Detalhado
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-green-100 text-green-700 rounded-full p-3 mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium mb-2">WhatsApp Conectado!</h3>
        <p className="text-muted-foreground mb-4 text-center">
          Seu WhatsApp está conectado e pronto para uso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6">
      {qrCode ? (
        <div>
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <img 
              src={`data:image/png;base64,${qrCode}`} 
              alt="QR Code para WhatsApp" 
              className="w-64 h-64"
            />
          </div>
          <h3 className="text-lg font-medium mb-2">Escaneie o QR Code</h3>
          <ol className="text-sm text-muted-foreground mb-4 space-y-2">
            <li>1. Abra o WhatsApp no seu telefone</li>
            <li>2. Toque em Menu ou Configurações e selecione WhatsApp Web</li>
            <li>3. Aponte a câmera para esta tela para escanear o código</li>
          </ol>
          <div className="flex gap-2">
            <Button onClick={fetchQRCode} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Gerar Novo QR Code
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 mb-2 font-medium">QR Code não disponível</p>
            <p className="text-muted-foreground mb-4">
              Status: {status}
            </p>
            <p className="text-sm">
              Verifique se a instância Z-API está configurada corretamente. 
              Se o problema persistir, tente obter um diagnóstico detalhado.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchQRCode} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  toast({
                    title: "Executando diagnóstico...",
                    description: "Verificando a conexão com a Z-API",
                  });
                  const result = await apiRequest("GET", `/api/channels/${channelId}/status`);
                  console.log("Diagnóstico Z-API:", result);
                  
                  // Mostrar resultado diagnóstico em toast
                  const recommendations = result.recommendations || [];
                  toast({
                    title: "Diagnóstico Z-API",
                    description: 
                      recommendations.length > 0 
                        ? `${recommendations.length} ${recommendations.length === 1 ? 'recomendação' : 'recomendações'} encontrada${recommendations.length === 1 ? '' : 's'}.`
                        : "Nenhum problema crítico encontrado",
                    variant: recommendations.length > 0 ? "destructive" : "default",
                  });
                  
                  // Se há problemas no diagnóstico, mostrar erro informativo
                  if (recommendations.length > 0) {
                    setError(`Diagnóstico Z-API:\n\n${recommendations.join('\n\n')}`);
                  }
                } catch (error) {
                  console.error("Erro ao executar diagnóstico:", error);
                  toast({
                    title: "Erro no diagnóstico",
                    description: "Não foi possível obter diagnóstico da integração",
                    variant: "destructive"
                  });
                }
              }}
            >
              Executar Diagnóstico
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Função para extrair o ID da instância da URL Z-API
function extractZAPIInstanceId(input: string): string {
  if (!input) return '';
  
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
  
  // Se não conseguir extrair, retorne o input original como fallback
  return input;
}

// Função para extrair o token da URL Z-API se estiver neste formato: /token/XXX/
function extractZAPIToken(input: string): string {
  if (!input) return '';
  
  // Verificar se parece com uma URL
  if (input.includes('http') || input.includes('/')) {
    // Tentar extrair o token após "/token/"
    const tokenMatch = input.match(/\/token\/([A-Za-z0-9]+)(?:\/|$)/);
    if (tokenMatch && tokenMatch[1]) {
      return tokenMatch[1];
    }
  }
  
  // Se não conseguir extrair, retornar o input original
  return input;
}

export interface ZAPIIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: any;
  onChannelCreated?: (channelId: number) => void;
  onChannelUpdated?: (channelId: number) => void;
}

export function ZAPIIntegrationDialog({
  open,
  onOpenChange,
  channel,
  onChannelCreated,
  onChannelUpdated
}: ZAPIIntegrationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const isNewChannel = !channel?.id;

  // Formulário com validação
  const form = useForm<ZAPIConfigFormValues>({
    resolver: zodResolver(zapiConfigSchema),
    defaultValues: {
      instanceId: channel?.config?.instanceId || '',
      token: channel?.config?.token || '',
      phone: channel?.config?.phone || ''
    }
  });

  // Atualizar o formulário quando o canal mudar
  useEffect(() => {
    if (channel?.config) {
      form.reset({
        instanceId: channel.config.instanceId || '',
        token: channel.config.token || '',
        phone: channel.config.phone || ''
      });
    }
  }, [channel, form]);

  const handleSubmit = async (values: ZAPIConfigFormValues) => {
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: `WhatsApp (${values.phone})`,
        type: 'whatsapp',
        config: {
          ...values,
          provider: 'zapi'
        }
      };
      
      let response;
      
      if (isNewChannel) {
        // Criar novo canal
        response = await apiRequest<{id: number}>("POST", "/api/channels", payload);
        
        if (response.id) {
          toast({
            title: "Canal criado com sucesso",
            description: "Canal de WhatsApp via Z-API configurado."
          });
          onChannelCreated?.(response.id);
          setActiveTab('accounts'); // Mudar para a tab de QR Code após criar
        }
      } else {
        // Atualizar canal existente
        response = await apiRequest<{id: number}>("PUT", `/api/channels/${channel.id}`, payload);
        
        if (response.id) {
          toast({
            title: "Canal atualizado",
            description: "Configurações do canal de WhatsApp salvas."
          });
          onChannelUpdated?.(response.id);
        }
      }
    } catch (error) {
      console.error('Erro ao configurar canal Z-API:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações do canal.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IntegrationConfigDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Integração WhatsApp (Z-API)"
      description="Configure a integração com WhatsApp usando Z-API"
      size="large"
    >
      <IntegrationTabs defaultTab={activeTab}>
        <IntegrationTabContent value="config">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <h4 className="text-blue-800 font-medium mb-1 text-sm">Configuração da Z-API</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Para integrar com WhatsApp, você precisará de uma conta Z-API e os dados abaixo.
                  Todas estas informações estão disponíveis no <a href="https://app.z-api.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">painel da Z-API</a>.
                </p>
                <ul className="text-xs text-gray-600 list-disc pl-5">
                  <li>Acesse sua conta na Z-API</li>
                  <li>Crie uma instância ou selecione uma existente</li>
                  <li>Copie o ID da instância e o token</li>
                  <li>Utilize o formato internacional para o número de telefone</li>
                </ul>
              </div>

              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="instanceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <span>ID da Instância</span>
                        <span className="text-red-500 ml-1">*</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>Pode colar a URL completa da Z-API e clicar em "Extrair ID"</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Exemplo: https://api.z-api.io/instances/3DF871A7ADFB20FB49998E66062CE0C1/token/...
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input 
                            placeholder="Cole a URL completa ou ID direto: 3DF871A7ADFB20FB49998E66062CE0C1" 
                            {...field} 
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const currentValue = field.value;
                            if (!currentValue) {
                              toast({
                                title: "Campo vazio",
                                description: "Insira uma URL ou ID para extrair",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Extrair ID da instância
                            const extractedId = extractZAPIInstanceId(currentValue);
                            if (extractedId !== currentValue) {
                              form.setValue('instanceId', extractedId);
                              
                              // Tentar extrair token também
                              const extractedToken = extractZAPIToken(currentValue);
                              if (extractedToken && !form.getValues('token')) {
                                form.setValue('token', extractedToken);
                                toast({
                                  title: "Dados extraídos com sucesso",
                                  description: "ID da instância e token foram extraídos automaticamente",
                                  variant: "default"
                                });
                              } else {
                                toast({
                                  title: "ID extraído com sucesso",
                                  description: "O ID da instância foi extraído da URL fornecida",
                                  variant: "default"
                                });
                              }
                            } else {
                              toast({
                                title: "Nenhuma alteração necessária",
                                description: "O valor já parece ser um ID válido",
                                variant: "default"
                              });
                            }
                          }}
                        >
                          Extrair ID
                        </Button>
                      </div>
                      <FormDescription>
                        Encontre o ID da instância no painel da Z-API em "Detalhes da Instância", ou cole a URL completa e use o botão "Extrair ID".
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Token
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: D0QAF9X80EJDJTFG59BC17EC25D6JFHY" {...field} />
                      </FormControl>
                      <FormDescription>
                        Token de autenticação da sua instância Z-API, encontrado na seção "Detalhes da Instância".
                        É um código longo único para cada instância.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Telefone
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 5511999999999" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número do telefone conectado ao WhatsApp desta instância no formato internacional.
                        Use apenas números, sem espaços, hífens ou outros caracteres (Ex: 5511999999999).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNewChannel ? 'Criar Canal' : 'Atualizar Canal'}
              </Button>
            </form>
          </Form>
        </IntegrationTabContent>
        
        <IntegrationTabContent value="accounts">
          <Card>
            <CardContent className="p-0">
              {channel?.id ? (
                <WhatsAppQRCode channelId={channel.id} />
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-muted-foreground">
                    Primeiro configure e salve as informações do canal para conectar via QR Code.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </IntegrationTabContent>
        
        <IntegrationTabContent value="hooks">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Configuração de Webhooks</h3>
              {channel?.id ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    Configure o webhook da Z-API para receber notificações em tempo real de mensagens, status de conexão e outros eventos.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">URL do Webhook:</p>
                    <div className="flex items-center">
                      <p className="font-mono text-sm break-all mr-2 bg-white p-2 rounded border border-gray-200 flex-1">
                        {`${window.location.origin}/api/webhooks/zapi/${channel.id}`}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/zapi/${channel.id}`);
                          toast({
                            title: "URL copiada",
                            description: "URL do webhook copiada para a área de transferência",
                            duration: 3000
                          });
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <h4 className="text-blue-800 font-medium text-sm mb-2">Instruções de Configuração</h4>
                    <ol className="text-sm text-gray-700 list-decimal pl-5 space-y-2">
                      <li>Acesse o painel da Z-API e selecione sua instância</li>
                      <li>Navegue até a seção "Webhooks" ou "Configurações"</li>
                      <li>Insira a URL acima no campo "URL do Webhook"</li>
                      <li>Certifique-se de ativar <span className="font-medium">todos os eventos</span> para o funcionamento completo</li>
                      <li>Salve as configurações no painel da Z-API</li>
                    </ol>
                    
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-blue-700">
                        <strong>Importante:</strong> A Z-API enviará notificações para esta URL sempre que houver novos eventos no WhatsApp.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                    <h4 className="text-yellow-800 font-medium text-sm mb-1">Resolução de Problemas</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      Se as mensagens não estiverem chegando em tempo real:
                    </p>
                    <ul className="text-sm text-gray-700 list-disc pl-5">
                      <li>Verifique se o webhook está configurado corretamente na Z-API</li>
                      <li>Confirme se a URL tem acesso público (não está em localhost)</li>
                      <li>Certifique-se de que todos os eventos estão habilitados</li>
                      <li>Teste a conexão enviando uma mensagem de teste</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="bg-gray-100 rounded-full p-3 mb-4 text-gray-400">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Configuração Pendente</h3>
                  <p className="text-muted-foreground text-center">
                    Primeiro configure e salve as informações do canal para obter a URL do webhook.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </IntegrationTabContent>
      </IntegrationTabs>
    </IntegrationConfigDialog>
  );
}