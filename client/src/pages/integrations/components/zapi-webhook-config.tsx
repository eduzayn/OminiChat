import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, RefreshCw, Webhook } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WebhookConfig {
  onMessageReceived: boolean;
  onMessageSent: boolean;
  onStatusChange: boolean;
  onChatPresence: boolean;
  onConnected: boolean;
  notifyByEmail: boolean;
}

export function ZAPIWebhookConfig({ channelId }: { channelId: number }) {
  const [webhookStatus, setWebhookStatus] = useState<'configured' | 'not_configured' | 'unknown' | 'checking'>('unknown');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    onMessageReceived: true,
    onMessageSent: true,
    onStatusChange: true,
    onChatPresence: false,
    onConnected: true,
    notifyByEmail: false
  });

  const toast = useToast();

  // Verificar status do webhook ao carregar ou quando o canal mudar
  useEffect(() => {
    if (channelId) {
      checkWebhookStatus();
    }
  }, [channelId]);

  // Verificar o status atual do webhook
  const checkWebhookStatus = async () => {
    if (!channelId) return;
    
    setWebhookStatus('checking');
    
    try {
      const response = await fetch(`/api/channels/${channelId}/webhook-status`);
      const data = await response.json();
      
      console.log("Status do webhook:", data);
      
      if (data.success) {
        setWebhookStatus(data.configured ? 'configured' : 'not_configured');
        setWebhookUrl(data.webhookUrl || '');
        
        // Se temos configurações de webhook específicas na resposta
        if (data.webhookFeatures) {
          setWebhookConfig({
            onMessageReceived: data.webhookFeatures.receiveAllNotifications || data.webhookFeatures.messageReceived || false,
            onMessageSent: data.webhookFeatures.messageCreate || false,
            onStatusChange: data.webhookFeatures.statusChange || false,
            onChatPresence: data.webhookFeatures.presenceChange || false,
            onConnected: data.webhookFeatures.deviceConnected || false,
            notifyByEmail: data.webhookFeatures.receiveByEmail || false
          });
        }
      } else {
        setWebhookStatus('unknown');
        toast.toast({
          title: 'Erro ao verificar webhook',
          description: data.message || 'Não foi possível verificar o status do webhook',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error("Erro ao verificar status do webhook:", error);
      setWebhookStatus('unknown');
      toast.toast({
        title: 'Erro ao verificar webhook',
        description: 'Ocorreu um erro ao verificar o status do webhook',
        variant: 'destructive'
      });
    }
  };

  // Configurar o webhook
  const configureWebhook = async () => {
    if (!channelId) return;
    
    setConfiguring(true);
    console.log(`Iniciando configuração do webhook para canal ${channelId}...`);
    
    try {
      // Coletar todas as configurações para o webhook
      const webhookFeatures = {
        // Ativamos receiveAllNotifications quando todos principais eventos estão habilitados
        receiveAllNotifications: webhookConfig.onMessageReceived && webhookConfig.onMessageSent && webhookConfig.onStatusChange,
        // Garantimos que messageReceived esteja ativo (campo crucial)
        messageReceived: webhookConfig.onMessageReceived,
        messageCreate: webhookConfig.onMessageSent,
        statusChange: webhookConfig.onStatusChange,
        presenceChange: webhookConfig.onChatPresence,
        deviceConnected: webhookConfig.onConnected,
        receiveByEmail: webhookConfig.notifyByEmail
      };
      
      console.log(`Enviando configurações:`, JSON.stringify(webhookFeatures, null, 2));
      
      const response = await fetch(`/api/channels/${channelId}/configure-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookFeatures
        })
      });
      
      const data = await response.json();
      console.log("Resposta da configuração do webhook:", data);
      
      if (data.success) {
        setWebhookStatus('configured');
        setWebhookUrl(data.webhookUrl || '');
        
        toast.toast({
          title: 'Webhook configurado',
          description: 'Webhook configurado com sucesso. A configuração será mantida mesmo se você sair ou recarregar a página.',
          variant: 'default'
        });
        
        // Aguardar um momento antes de verificar o status para dar tempo do banco de dados atualizar
        setTimeout(() => {
          checkWebhookStatus();
        }, 1000);
      } else {
        toast.toast({
          title: 'Erro ao configurar webhook',
          description: data.message || 'Não foi possível configurar o webhook',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      toast.toast({
        title: 'Erro ao configurar webhook',
        description: 'Ocorreu um erro ao configurar o webhook',
        variant: 'destructive'
      });
    } finally {
      setConfiguring(false);
    }
  };

  // Remover o webhook
  const removeWebhook = async () => {
    if (!channelId) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/channels/${channelId}/remove-webhook`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWebhookStatus('not_configured');
        setWebhookUrl('');
        
        toast.toast({
          title: 'Webhook removido',
          description: 'Webhook removido com sucesso',
          variant: 'default'
        });
      } else {
        toast.toast({
          title: 'Erro ao remover webhook',
          description: data.message || 'Não foi possível remover o webhook',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error("Erro ao remover webhook:", error);
      toast.toast({
        title: 'Erro ao remover webhook',
        description: 'Ocorreu um erro ao remover o webhook',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configuração de Webhooks Z-API</CardTitle>
        <CardDescription>
          Configure os webhooks para receber diferentes tipos de eventos do WhatsApp
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Status do Webhook</h3>
              <Button 
                onClick={checkWebhookStatus} 
                variant="outline" 
                size="sm"
                disabled={webhookStatus === 'checking'}
              >
                {webhookStatus === 'checking' ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Verificar Status
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 p-4 border rounded-md">
              {webhookStatus === 'configured' && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <div>
                    <p className="font-medium">Webhook configurado</p>
                    {webhookUrl && (
                      <p className="text-sm text-gray-500">URL: {webhookUrl}</p>
                    )}
                  </div>
                </div>
              )}
              
              {webhookStatus === 'not_configured' && (
                <div className="flex items-center text-amber-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>Webhook não configurado</p>
                </div>
              )}
              
              {webhookStatus === 'unknown' && (
                <div className="flex items-center text-gray-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>Status desconhecido</p>
                </div>
              )}
              
              {webhookStatus === 'checking' && (
                <div className="flex items-center text-blue-500">
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  <p>Verificando status...</p>
                </div>
              )}
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configurações do Webhook</h3>
            <p className="text-sm text-gray-500">
              Selecione quais tipos de eventos você deseja receber via webhook
            </p>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="onMessageReceived" className="flex flex-col space-y-1">
                  <span>Receber Mensagens</span>
                  <span className="font-normal text-xs text-gray-500">Notifica quando uma mensagem é recebida</span>
                </Label>
                <Switch
                  id="onMessageReceived"
                  checked={webhookConfig.onMessageReceived}
                  onCheckedChange={(checked) => setWebhookConfig({...webhookConfig, onMessageReceived: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="onMessageSent" className="flex flex-col space-y-1">
                  <span>Envio de Mensagens</span>
                  <span className="font-normal text-xs text-gray-500">Notifica quando uma mensagem é enviada</span>
                </Label>
                <Switch
                  id="onMessageSent"
                  checked={webhookConfig.onMessageSent}
                  onCheckedChange={(checked) => setWebhookConfig({...webhookConfig, onMessageSent: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="onStatusChange" className="flex flex-col space-y-1">
                  <span>Mudanças de Status</span>
                  <span className="font-normal text-xs text-gray-500">Notifica quando o status de uma mensagem muda (enviado, entregue, lido)</span>
                </Label>
                <Switch
                  id="onStatusChange"
                  checked={webhookConfig.onStatusChange}
                  onCheckedChange={(checked) => setWebhookConfig({...webhookConfig, onStatusChange: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="onChatPresence" className="flex flex-col space-y-1">
                  <span>Presença no Chat</span>
                  <span className="font-normal text-xs text-gray-500">Notifica quando um contato está digitando ou online</span>
                </Label>
                <Switch
                  id="onChatPresence"
                  checked={webhookConfig.onChatPresence}
                  onCheckedChange={(checked) => setWebhookConfig({...webhookConfig, onChatPresence: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="onConnected" className="flex flex-col space-y-1">
                  <span>Conexão do Dispositivo</span>
                  <span className="font-normal text-xs text-gray-500">Notifica quando o dispositivo conecta ou desconecta</span>
                </Label>
                <Switch
                  id="onConnected"
                  checked={webhookConfig.onConnected}
                  onCheckedChange={(checked) => setWebhookConfig({...webhookConfig, onConnected: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="notifyByEmail" className="flex flex-col space-y-1">
                  <span>Notificar por Email</span>
                  <span className="font-normal text-xs text-gray-500">Recebe notificações por email (configurado na Z-API)</span>
                </Label>
                <Switch
                  id="notifyByEmail"
                  checked={webhookConfig.notifyByEmail}
                  onCheckedChange={(checked) => setWebhookConfig({...webhookConfig, notifyByEmail: checked})}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <Button
              onClick={configureWebhook}
              disabled={configuring || !channelId}
              className="flex-1"
            >
              {configuring ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Webhook className="h-4 w-4 mr-2" />
              )}
              {webhookStatus === 'configured' ? 'Atualizar Webhook' : 'Configurar Webhook'}
            </Button>
            
            {webhookStatus === 'configured' && (
              <Button
                onClick={removeWebhook}
                variant="destructive"
                disabled={loading || !channelId}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                Remover
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}