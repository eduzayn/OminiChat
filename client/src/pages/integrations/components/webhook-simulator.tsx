import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface WebhookSimulatorProps {
  channelId: number;
}

const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({ channelId }) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState('5511999999999');
  const [senderName, setSenderName] = useState('Contato Teste Simulado');
  const [message, setMessage] = useState('Esta é uma mensagem de teste do webhook simulado');
  const [eventType, setEventType] = useState('onMessageReceived');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiRequest(`/api/channels/${channelId}/simulate-webhook`, {
        method: 'POST',
        data: {
          phone,
          senderName,
          message,
          eventType
        }
      });

      setResult(response);
      toast({
        title: response.success ? 'Webhook simulado com sucesso' : 'Falha ao simular webhook',
        description: response.message,
        variant: response.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Erro ao simular webhook:', error);
      toast({
        title: 'Erro ao simular webhook',
        description: 'Ocorreu um erro ao tentar simular o webhook. Verifique o console para mais detalhes.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Simulador de Webhook</CardTitle>
        <CardDescription>
          Simule o recebimento de uma mensagem via webhook para testar a integração.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Número de telefone (com DDD e código do país)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="senderName">Nome do Remetente</Label>
            <Input
              id="senderName"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nome do contato que aparecerá como remetente"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Texto da mensagem que será recebida"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="eventType">Tipo de Evento</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger id="eventType">
                <SelectValue placeholder="Selecione o tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onMessageReceived">Mensagem Recebida (onMessageReceived)</SelectItem>
                <SelectItem value="message">Mensagem (formato alternativo)</SelectItem>
                <SelectItem value="DeliveryCallback">Confirmação de Entrega</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Simular Webhook'
            )}
          </Button>
        </form>
      </CardContent>
      
      {result && (
        <CardFooter className="flex flex-col items-start">
          <p className="text-sm font-medium mb-2">Resultado:</p>
          <pre className="text-xs bg-secondary p-4 rounded-md w-full overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardFooter>
      )}
    </Card>
  );
};

export default WebhookSimulator;