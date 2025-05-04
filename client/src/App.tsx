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
import { useAuth } from "./context/auth-context";
import { AuthProvider } from "./context/auth-context";
import { SocketProvider } from "./context/socket-context";
import { ConversationProvider } from "./context/conversation-context";
import { useEffect } from "react";

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
      <Route path="/" component={Dashboard} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/crm" component={CRMDashboard} />
      <Route path="/crm/pipeline" component={PipelineView} />
      <Route path="/crm/leads" component={LeadsManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ConversationProvider>
          <Router />
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
