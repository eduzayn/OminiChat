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
      const data = await apiRequest<{qrcode?: string; status?: string; message?: string}>("GET", `/api/channels/${channelId}/qrcode`);
      
      if (data.qrcode) {
        setQrCode(data.qrcode);
        setStatus(data.status || 'waiting');
      } else if (data.status === 'connected') {
        setStatus('connected');
        setQrCode(null);
      } else {
        setError(data.message || 'Não foi possível gerar o QR Code');
      }
    } catch (err) {
      setError('Erro ao obter o QR Code. Tente novamente.');
      console.error('Erro ao obter QR Code:', err);
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
          <p className="text-muted-foreground mb-4">
            QR Code não disponível. Status: {status}
          </p>
          <Button onClick={fetchQRCode} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
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