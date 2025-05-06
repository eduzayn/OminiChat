import React from 'react';
import { LucideIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  status?: 'connected' | 'disconnected' | 'pending' | 'error';
  onClick: () => void;
  onDelete?: () => void;
  buttonText?: string;
  id: number;
}

export function IntegrationCard({
  title,
  description,
  icon: Icon,
  color,
  status = 'disconnected',
  onClick,
  onDelete,
  buttonText = 'Configurar',
  id
}: IntegrationCardProps) {
  const statusText = {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    pending: 'Conexão pendente',
    error: 'Erro na conexão'
  };

  const statusClass = {
    connected: 'bg-green-100 text-green-700 border-green-200',
    disconnected: 'bg-gray-100 text-gray-700 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    error: 'bg-red-100 text-red-700 border-red-200'
  };

  return (
    <Card className="border hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(`w-12 h-12 rounded-full ${color} flex items-center justify-center flex-shrink-0`)}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-lg">{title}</h3>
              <span className={cn("text-xs px-2 py-1 rounded-full border", statusClass[status])}>
                {statusText[status]}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            
            <div className="flex space-x-2">
              <Button 
                onClick={onClick}
                variant={status === 'connected' ? 'outline' : 'default'}
                size="sm"
              >
                {status === 'connected' ? 'Gerenciar' : buttonText}
              </Button>
              
              {onDelete && (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}