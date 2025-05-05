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
import { Loader2, Facebook, Link2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  IntegrationConfigDialog, 
  IntegrationTabs, 
  IntegrationTabContent 
} from './integration-config-dialog';

// Schema de validação para configuração do Meta API
const metaConfigSchema = z.object({
  accessToken: z.string()
    .min(1, "O token de acesso é obrigatório"),
  pageId: z.string()
    .min(1, "O ID da página é obrigatório"),
  instagramAccountId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
  wabaId: z.string().optional()
});

type MetaConfigFormValues = z.infer<typeof metaConfigSchema>;

// Componente para seleção do tipo de canal
function ChannelTypeSelector({ value, onChange }: { 
  value: 'messenger' | 'instagram' | 'whatsapp'; 
  onChange: (value: 'messenger' | 'instagram' | 'whatsapp') => void; 
}) {
  return (
    <div className="space-y-2 mb-6">
      <FormLabel>Tipo de Canal</FormLabel>
      <Select 
        value={value} 
        onValueChange={(val) => onChange(val as 'messenger' | 'instagram' | 'whatsapp')}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o tipo de canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="messenger">Facebook Messenger</SelectItem>
          <SelectItem value="instagram">Instagram Direct</SelectItem>
          <SelectItem value="whatsapp">WhatsApp (API Oficial)</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Selecione o tipo de canal que deseja configurar
      </p>
    </div>
  );
}

export interface MetaIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: any;
  onChannelCreated?: (channelId: number) => void;
  onChannelUpdated?: (channelId: number) => void;
}

export function MetaIntegrationDialog({
  open,
  onOpenChange,
  channel,
  onChannelCreated,
  onChannelUpdated
}: MetaIntegrationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [channelType, setChannelType] = useState<'messenger' | 'instagram' | 'whatsapp'>(
    channel?.type || 'messenger'
  );
  const isNewChannel = !channel?.id;

  // Formulário com validação
  const form = useForm<MetaConfigFormValues>({
    resolver: zodResolver(metaConfigSchema),
    defaultValues: {
      accessToken: channel?.config?.accessToken || '',
      pageId: channel?.config?.pageId || '',
      instagramAccountId: channel?.config?.instagramAccountId || '',
      phoneNumberId: channel?.config?.phoneNumberId || '',
      businessAccountId: channel?.config?.businessAccountId || '',
      wabaId: channel?.config?.wabaId || ''
    }
  });

  // Atualizar o formulário quando o canal mudar
  useEffect(() => {
    if (channel?.config) {
      form.reset({
        accessToken: channel.config.accessToken || '',
        pageId: channel.config.pageId || '',
        instagramAccountId: channel.config.instagramAccountId || '',
        phoneNumberId: channel.config.phoneNumberId || '',
        businessAccountId: channel.config.businessAccountId || '',
        wabaId: channel.config.wabaId || ''
      });
      
      if (channel.type) {
        setChannelType(channel.type);
      }
    }
  }, [channel, form]);

  const handleSubmit = async (values: MetaConfigFormValues) => {
    setIsSubmitting(true);
    
    try {
      let name = '';
      if (channelType === 'messenger') {
        name = `Facebook Messenger`;
      } else if (channelType === 'instagram') {
        name = `Instagram Direct`;
      } else {
        name = `WhatsApp Business`;
      }
      
      const payload = {
        name,
        type: channelType,
        config: {
          ...values,
          provider: 'meta'
        }
      };
      
      let response;
      
      if (isNewChannel) {
        // Criar novo canal
        response = await apiRequest<{id: number}>('/api/channels', {
          method: 'POST',
          data: payload
        });
        
        if (response.id) {
          toast({
            title: "Canal criado com sucesso",
            description: `Canal de ${name} via Meta API configurado.`
          });
          onChannelCreated?.(response.id);
        }
      } else {
        // Atualizar canal existente
        response = await apiRequest<{id: number}>(`/api/channels/${channel.id}`, {
          method: 'PUT',
          data: payload
        });
        
        if (response.id) {
          toast({
            title: "Canal atualizado",
            description: `Configurações do canal de ${name} salvas.`
          });
          onChannelUpdated?.(response.id);
        }
      }
    } catch (error) {
      console.error('Erro ao configurar canal Meta:', error);
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
      title="Integração Meta (Facebook, Instagram, WhatsApp)"
      description="Configure a integração com os canais da Meta usando a API oficial"
      size="large"
    >
      <IntegrationTabs defaultTab="config">
        <IntegrationTabContent value="config">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-6">
                <ChannelTypeSelector 
                  value={channelType} 
                  onChange={setChannelType} 
                />
                
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token de Acesso</FormLabel>
                      <FormControl>
                        <Input placeholder="Token de acesso da API Meta" {...field} />
                      </FormControl>
                      <FormDescription>
                        Token de acesso permanente obtido no Facebook Developer Portal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID da Página</FormLabel>
                      <FormControl>
                        <Input placeholder="ID da página do Facebook" {...field} />
                      </FormControl>
                      <FormDescription>
                        ID da página do Facebook associada a este canal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {channelType === 'instagram' && (
                  <FormField
                    control={form.control}
                    name="instagramAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID da Conta do Instagram</FormLabel>
                        <FormControl>
                          <Input placeholder="ID da conta do Instagram" {...field} />
                        </FormControl>
                        <FormDescription>
                          ID da conta do Instagram Business conectada à página do Facebook.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {channelType === 'whatsapp' && (
                  <>
                    <FormField
                      control={form.control}
                      name="phoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Número de Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="ID do número de telefone" {...field} />
                          </FormControl>
                          <FormDescription>
                            ID do número de telefone registrado na API WhatsApp Business.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="businessAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID da Conta Business</FormLabel>
                          <FormControl>
                            <Input placeholder="ID da conta business" {...field} />
                          </FormControl>
                          <FormDescription>
                            ID da conta business da Meta.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="wabaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do WhatsApp Business Account (WABA)</FormLabel>
                          <FormControl>
                            <Input placeholder="ID da conta WhatsApp Business" {...field} />
                          </FormControl>
                          <FormDescription>
                            ID da sua conta WhatsApp Business.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
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
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Facebook className="h-6 w-6 text-blue-600" />
                </div>
                
                <h3 className="text-lg font-medium mb-2">
                  {channelType === 'messenger' && 'Facebook Messenger'}
                  {channelType === 'instagram' && 'Instagram Direct'}
                  {channelType === 'whatsapp' && 'WhatsApp Business API'}
                </h3>
                
                <p className="text-center text-muted-foreground mb-4">
                  {channel?.id ? (
                    'Conectado! Configure seu webhook para começar a receber mensagens.'
                  ) : (
                    'Configure o canal na aba Configuração para conectar.'
                  )}
                </p>
                
                {channel?.id && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="https://developers.facebook.com/docs/messenger-platform/get-started" 
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Documentação
                      </a>
                    </Button>
                  </div>
                )}
              </div>
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
                    Configure este webhook no portal de desenvolvedores da Meta para receber notificações:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="font-mono text-sm break-all">
                      {`${window.location.origin}/api/webhooks/meta`}
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">
                      Para o Messenger, configure os eventos: "messages" e "messaging_postbacks".
                      <br />
                      Para o Instagram, configure os eventos: "instagram_business_messaging".
                      <br />
                      Para o WhatsApp, configure os eventos: "messages" e "message_status".
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