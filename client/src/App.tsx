import React, { Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import ContactsPage from "@/pages/contacts";
import CRMDashboard from "@/pages/crm/index";
import PipelineView from "@/pages/crm/pipeline";
import LeadsManagement from "@/pages/crm/leads";
import SettingsPage from "@/pages/settings/index";
import AIAssistantPage from "@/pages/ai/index";
import OrganizationsPage from "@/pages/organizations";
import { useAuth } from "./context/auth-context";
import { AuthProvider } from "./context/auth-context";
import { SocketProvider } from "./context/socket-context";
import { ConversationProvider } from "./context/conversation-context";
import { ZAPINotifications } from "@/components/zapi-notifications";

// Página de placeholder para módulos em desenvolvimento
import PlaceholderPage from "@/pages/placeholder";

function Router() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user && location !== "/login") {
        setLocation("/login");
      } else if (user && location === "/login") {
        setLocation("/");
      }
    }
  }, [user, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* 1. Módulo de Comunicação Omnichannel */}
      <Route path="/" component={Dashboard} />
      
      {/* 2. Módulo de IA */}
      <Route path="/ai" component={AIAssistantPage} />
      
      {/* 3. Módulo de CRM */}
      <Route path="/crm" component={CRMDashboard} />
      <Route path="/crm/pipeline" component={PipelineView} />
      <Route path="/crm/leads" component={LeadsManagement} />
      <Route path="/contacts" component={ContactsPage} />
      
      {/* 4. Módulo Multi-Tenant */}
      <Route path="/organizations" component={OrganizationsPage} />
      
      {/* 5. Módulo de Autenticação e Permissões */}
      <Route path="/security">
        {() => <PlaceholderPage 
          moduleName="Segurança" 
          description="O módulo de segurança oferece controle refinado de acesso com regras baseadas em atributos (ABAC)."
          features={[
            "Autenticação JWT",
            "Permissões por tipo de usuário, tenant, canal e status",
            "Middleware de validação",
            "Editor visual de políticas (futuro)"
          ]}
        />}
      </Route>
      
      {/* 6. Módulo de Integrações */}
      <Route path="/integrations">
        {() => <PlaceholderPage 
          moduleName="Integrações" 
          description="O módulo de integrações administra e conecta sistemas externos ao ecossistema."
          features={[
            "WhatsApp (API não oficial ou oficial)",
            "Meta (Messenger/Instagram via Graph API)",
            "Asaas (financeiro e cobrança)",
            "SMTP/IMAP (e-mail)",
            "Webhooks"
          ]}
        />}
      </Route>
      
      {/* 7. Módulo de Suporte Interno */}
      <Route path="/team-chat">
        {() => <PlaceholderPage 
          moduleName="Chat da Equipe" 
          description="O módulo de comunicação interna oferece recursos modernos para colaboração entre usuários."
          features={[
            "Chat entre colaboradores com texto e áudio",
            "Transcrição de voz (Whisper)",
            "Canais públicos e privados",
            "Threads e notificações",
            "Histórico auditável por tenant"
          ]}
        />}
      </Route>
      
      {/* 8. Módulo de Relatórios */}
      <Route path="/reports">
        {() => <PlaceholderPage 
          moduleName="Relatórios" 
          description="O módulo de relatórios permite a geração de dashboards e análises avançadas."
          features={[
            "Relatórios de atendimento por canal",
            "Performance da equipe e leads convertidos",
            "Tempo médio de resposta",
            "Satisfação e feedbacks",
            "Indicadores da IA e de uso geral do sistema"
          ]}
        />}
      </Route>
      
      {/* Outros */}
      <Route path="/payments">
        {() => <PlaceholderPage 
          moduleName="Pagamentos" 
          description="O módulo de pagamentos integra com serviços financeiros para gerenciar cobranças e faturas."
          features={[
            "Integração com Asaas",
            "Geração de links de pagamento",
            "Acompanhamento de status de pagamentos",
            "Histórico de transações",
            "Relatórios financeiros"
          ]}
        />}
      </Route>
      
      <Route path="/settings" component={SettingsPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithProviders() {
  const AuthenticatedApp = () => {
    const { user } = useAuth();
    
    // Renderizar notificações Z-API apenas quando o usuário estiver autenticado
    return (
      <>
        <Router />
        {user && <ZAPINotifications />}
      </>
    );
  };

  return (
    <AuthProvider>
      <SocketProvider>
        <ConversationProvider>
          <AuthenticatedApp />
        </ConversationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWithProviders />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
