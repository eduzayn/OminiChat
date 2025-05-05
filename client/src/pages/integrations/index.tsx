import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { CircuitBoard, MessageSquare, ArrowLeft, Phone, Mail, Webhook } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Página de Integrações do Sistema
 * 
 * Esta página administra e conecta sistemas externos ao ecossistema OmniConnect.
 * Será ampliada para incluir a configuração e gerenciamento de todas as integrações.
 */
export default function IntegrationsPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <Helmet>
        <title>Integrações | OmniConnect</title>
      </Helmet>
      
      <div className="flex h-screen bg-neutral-50">
        <Sidebar />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-6 px-4">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-neutral-900">Integrações</h1>
              <p className="text-neutral-500">Módulo em desenvolvimento</p>
            </div>

            <Card className="border border-dashed border-gray-300 bg-white">
              <CardContent className="p-8 flex flex-col items-center">
                <div className="w-24 h-24 mb-6">
                  <CircuitBoard className="w-full h-full text-primary/60" />
                </div>
                
                <h2 className="text-xl font-semibold text-center mb-2">Módulo de Integrações em Construção</h2>
                <p className="text-center text-muted-foreground mb-6 max-w-lg">
                  O módulo de integrações administra e conecta sistemas externos ao ecossistema.
                </p>
                
                <div className="w-full max-w-3xl">
                  <h3 className="text-lg font-medium mb-4">Funcionalidades Planejadas:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">WhatsApp (API não oficial ou oficial)</h4>
                        <p className="text-sm text-muted-foreground">Integração com Z-API (com QR Code) e Meta API oficial</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Meta (Messenger/Instagram)</h4>
                        <p className="text-sm text-muted-foreground">Integração via Graph API para mensagens diretas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Asaas (financeiro e cobrança)</h4>
                        <p className="text-sm text-muted-foreground">Integração para pagamentos e gerenciamento financeiro</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">SMTP/IMAP (e-mail)</h4>
                        <p className="text-sm text-muted-foreground">Integração com serviços de e-mail para mensagens</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Webhook className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Webhooks</h4>
                        <p className="text-sm text-muted-foreground">Configuração de webhooks para eventos do sistema</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Link to="/">
                    <Button className="w-full md:w-auto">
                      Voltar para a Caixa de Entrada
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}