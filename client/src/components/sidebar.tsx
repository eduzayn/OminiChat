import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import {
  Inbox,
  Users,
  UserCog,
  BarChart2,
  DollarSign,
  Settings,
  LogOut,
  LayoutDashboard,
  Brain,
  Building2,
  ShieldCheck,
  Layers,
  MessagesSquare,
  FileBarChart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavLink({ href, icon, label, active }: NavLinkProps) {
  const isMobile = useMobile();
  
  return (
    <Link href={href} className={cn(
      "flex items-center px-4 py-2.5 transition-all",
      active 
        ? "text-primary-500 bg-primary-50 border-l-4 border-primary-500" 
        : "text-neutral-600 hover:bg-neutral-100 border-l-4 border-transparent"
    )}>
      <span className="text-xl md:text-lg">{icon}</span>
      {!isMobile && <span className="ml-3 text-sm font-medium">{label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMobile();
  
  const handleLogout = () => {
    logout();
  };

  return (
    <aside className={cn(
      "bg-white border-r border-neutral-200 h-screen flex flex-col transition-all",
      isMobile ? "w-20" : "w-64"
    )}>
      {/* Logo section */}
      <div className="p-4 h-16 flex items-center justify-center md:justify-start border-b border-neutral-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center">
            <Inbox className="text-white" size={18} />
          </div>
          {!isMobile && <span className="ml-2 text-lg font-semibold text-neutral-900">OmniConnect</span>}
        </div>
      </div>
      
      {/* Navigation links */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {/* 1. Módulo de Comunicação */}
        <NavLink 
          href="/" 
          icon={<Inbox />} 
          label="Caixa de Entrada" 
          active={location === "/"} 
        />
        
        {/* 2. Módulo de IA */}
        <NavLink 
          href="/ai" 
          icon={<Brain />} 
          label="Assistente IA" 
          active={location.startsWith("/ai")} 
        />
        
        {/* 3. Módulo de CRM */}
        <NavLink 
          href="/crm" 
          icon={<LayoutDashboard />} 
          label="CRM" 
          active={location.startsWith("/crm")} 
        />
        
        {/* Contatos - parte do CRM */}
        <NavLink 
          href="/contacts" 
          icon={<Users />} 
          label="Contatos" 
          active={location === "/contacts"} 
        />
        
        {/* 4. Módulo Multi-Tenant */}
        <NavLink 
          href="/organizations" 
          icon={<Building2 />} 
          label="Organizações" 
          active={location.startsWith("/organizations")} 
        />
        
        {/* 5. Módulo de Autenticação e Permissões */}
        <NavLink 
          href="/security" 
          icon={<ShieldCheck />} 
          label="Segurança" 
          active={location.startsWith("/security")} 
        />
        
        {/* 6. Módulo de Integrações */}
        <NavLink 
          href="/integrations" 
          icon={<Layers />} 
          label="Integrações" 
          active={location.startsWith("/integrations")} 
        />
        
        {/* 7. Módulo de Suporte Interno */}
        <NavLink 
          href="/team-chat" 
          icon={<MessagesSquare />} 
          label="Chat da Equipe" 
          active={location.startsWith("/team-chat")} 
        />
        
        {/* 8. Módulo de Relatórios */}
        <NavLink 
          href="/reports" 
          icon={<FileBarChart />} 
          label="Relatórios" 
          active={location.startsWith("/reports")} 
        />
        
        {/* Outros */}
        <NavLink 
          href="/payments" 
          icon={<DollarSign />} 
          label="Pagamentos" 
          active={location === "/payments"} 
        />
        
        <NavLink 
          href="/settings" 
          icon={<Settings />} 
          label="Configurações" 
          active={location === "/settings"} 
        />
      </nav>
      
      {/* User profile */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center">
          <Avatar>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          {!isMobile && (
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-800">{user?.name}</p>
              <p className="text-xs text-neutral-500">Online</p>
            </div>
          )}
          {!isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto text-neutral-500" 
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
