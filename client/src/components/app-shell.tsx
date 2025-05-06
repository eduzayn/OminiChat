import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Users,
  BarChart,
  Settings,
  User,
  CreditCard,
  LogOut,
  Home,
  Building,
  UserPlus,
  Phone
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // Array of navigation items
  const navItems = [
    { href: '/', label: 'Início', icon: <Home className="h-5 w-5" /> },
    { href: '/inbox', label: 'Caixa de Entrada', icon: <MessageSquare className="h-5 w-5" /> },
    { href: '/contacts', label: 'Contatos', icon: <Users className="h-5 w-5" /> },
    { href: '/channels', label: 'Canais', icon: <Phone className="h-5 w-5" /> },
    { href: '/analytics', label: 'Relatórios', icon: <BarChart className="h-5 w-5" /> },
    { href: '/organizations', label: 'Organizações', icon: <Building className="h-5 w-5" /> },
    { href: '/users', label: 'Usuários', icon: <UserPlus className="h-5 w-5" /> },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        {/* Logo */}
        <div className="p-6">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <div className="p-1.5 bg-primary rounded-md">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">OmniConnect</span>
            </a>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location === item.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {React.cloneElement(item.icon, {
                      className: `mr-3 h-5 w-5 ${
                        location === item.href ? 'text-primary' : 'text-muted-foreground'
                      }`,
                    })}
                    {item.label}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-3 py-2">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
              </Link>
              <Link href="/billing">
                <DropdownMenuItem className="cursor-pointer">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Faturamento
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <div className="p-1.5 bg-primary rounded-md">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">OmniConnect</span>
            </a>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Navegação</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <DropdownMenuItem className="cursor-pointer">
                    {React.cloneElement(item.icon, {
                      className: 'h-4 w-4 mr-2',
                    })}
                    {item.label}
                  </DropdownMenuItem>
                </Link>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}