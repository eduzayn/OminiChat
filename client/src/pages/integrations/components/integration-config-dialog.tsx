import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

interface IntegrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  isLoading?: boolean;
  onSave?: () => Promise<void>;
  size?: 'default' | 'large';
}

export function IntegrationConfigDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerContent,
  isLoading = false,
  onSave,
  size = 'default'
}: IntegrationConfigDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave();
      } catch (error) {
        console.error("Erro ao salvar configuração:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={size === 'large' ? 'max-w-[750px] w-[90vw]' : 'max-w-[600px] w-[90vw]'}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <div>{children}</div>
        )}

        {(footerContent || onSave) && (
          <DialogFooter>
            {footerContent}
            {onSave && (
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Salvando...' : 'Salvar configuração'}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface IntegrationTabsProps {
  defaultTab?: string;
  children: React.ReactNode;
}

export function IntegrationTabs({ defaultTab = "config", children }: IntegrationTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="config">Configuração</TabsTrigger>
        <TabsTrigger value="accounts">Contas</TabsTrigger>
        <TabsTrigger value="hooks">Webhooks</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}

export function IntegrationTabContent({ 
  value, 
  children 
}: { 
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsContent value={value} className="space-y-4">
      {children}
    </TabsContent>
  );
}