import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type SimulateWebhookProps = {
  channelId: number;
};

export function WebhookSimulator({ channelId }: SimulateWebhookProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState('553798694620');
  const [senderName, setSenderName] = useState('Teste Webhook');
  const [message, setMessage] = useState('Olá, esta é uma mensagem de teste via webhook!');
  const [eventType, setEventType] = useState('onMessageReceived');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const simulateWebhook = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      const response = await apiRequest(`/api/channels/${channelId}/test-webhook`, {
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
        title: 'Webhook simulado',
        description: 'A simulação de webhook foi realizada com sucesso.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro ao simular webhook:', error);
      toast({
        title: 'Erro ao simular webhook',
        description: error instanceof Error ? error.message : 'Erro ao tentar simular webhook.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulador de Webhook</CardTitle>
        <CardDescription>
          Simule o recebimento de mensagens e eventos pelo webhook da Z-API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número do Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="553123456789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senderName">Nome do Remetente</Label>
            <Input
              id="senderName"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nome do contato"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventType">Tipo de Evento</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="onMessageReceived">onMessageReceived (Mensagem)</SelectItem>
              <SelectItem value="ReceivedCallback">ReceivedCallback (Novo formato)</SelectItem>
              <SelectItem value="message">message (Formato alternativo)</SelectItem>
              <SelectItem value="DeliveryCallback">DeliveryCallback (Confirmação de entrega)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem a ser simulada..."
            rows={3}
          />
        </div>
        
        {result && (
          <div className="mt-4 p-3 rounded-md bg-muted">
            <Label>Resultado:</Label>
            <pre className="text-xs overflow-auto mt-2 text-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={simulateWebhook}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Simulando...' : 'Simular Webhook'}
        </Button>
      </CardFooter>
    </Card>
  );
}