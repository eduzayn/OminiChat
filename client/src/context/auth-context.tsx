import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  avatarUrl?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Usar apiRequest para consistência
        const userData = await apiRequest<User | null>("GET", "/api/auth/me");
        
        if (userData && userData.id) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Em caso de erro de autenticação, apenas deixar o usuário como null
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log("Tentando login para usuário:", username);
      
      // Aqui a função apiRequest já retorna o JSON analisado
      const userData = await apiRequest<User>("POST", "/api/auth/login", {
        username,
        password,
      });
      
      console.log("Resposta de login recebida:", userData);
      
      if (userData && userData.id) {
        setUser(userData);
        return userData;
      } else {
        throw new Error("Não foi possível obter dados do usuário. Verifique usuário e senha.");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Melhorar a mensagem de erro para o usuário
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          throw new Error("Usuário ou senha incorretos. Tente novamente.");
        } else if (error.message.includes("500")) {
          throw new Error("Erro no servidor. Tente novamente mais tarde.");
        } else if (error.message.includes("Network")) {
          throw new Error("Erro de conexão. Verifique sua internet e tente novamente.");
        }
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setUser(null);
      
      // Clear all queries on logout
      queryClient.clear();
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
