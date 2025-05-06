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
import { MessageSquare, QrCode, Loader2, RefreshCcw } from 'lucide-react';
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
          
          // Adicionar mensagens personalizadas para códigos de erro conhecidos
          if (data.error_code === 'NOT_FOUND') {
            errorDetails += `\n\nEste erro indica que a API da Z-API não reconheceu sua instância. Verifique se as credenciais estão corretas no painel da Z-API.`;
          } else if (data.error_code === 'API_COMPATIBILITY_ERROR') {
            errorDetails += `\n\nEste erro indica um problema de compatibilidade com a API. Verifique a versão da sua Z-API e as URLs suportadas.`;
          }
        }
        
        // Exibir mensagem de erro com detalhes
        const errorMessage = data.message || 'Não foi possível gerar o QR Code';
        setError(`${errorMessage}${errorDetails ? '\n\n' + errorDetails : ''}`);
        
        toast({
          title: "Erro ao gerar QR Code",
          description: errorMessage,
          variant: "destructive"
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
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchQRCode} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
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
        <>
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
        </>
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
              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="instanceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID da Instância</FormLabel>
                      <FormControl>
                        <Input placeholder="ID da sua instância Z-API" {...field} />
                      </FormControl>
                      <FormDescription>
                        Encontre o ID da instância no painel da Z-API.
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
                      <FormLabel>Token</FormLabel>
                      <FormControl>
                        <Input placeholder="Token de autenticação" {...field} />
                      </FormControl>
                      <FormDescription>
                        Token da sua instância Z-API, usado para autenticação.
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
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="5511999999999" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número do telefone conectado no formato internacional sem espaços ou caracteres especiais.
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
                  <p className="text-sm text-muted-foreground">
                    Configure estes webhooks no painel da Z-API para receber notificações:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="font-mono text-sm break-all">
                      {`${window.location.origin}/api/webhooks/zapi/${channel.id}`}
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">
                      O webhook deve ser ativado para todos os eventos para garantir o funcionamento completo do sistema.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Primeiro configure e salve as informações do canal para obter a URL do webhook.
                </p>
              )}
            </CardContent>
          </Card>
        </IntegrationTabContent>
      </IntegrationTabs>
    </IntegrationConfigDialog>
  );
}