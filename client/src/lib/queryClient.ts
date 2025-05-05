import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  data?: unknown  
): Promise<T> {
  // Verificar e normalizar o caminho da API
  const url = path.startsWith('/') ? path : `/${path}`;
  
  try {
    const options: RequestInit = {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
    
    console.log(`Realizando ${method} para ${url}`);
    
    const res = await fetch(url, options);
    
    // Verificar o content-type para fazer o parse adequado
    const contentType = res.headers.get('content-type');
    
    if (!res.ok) {
      // Se a resposta tiver um código de erro
      let errorMessage = `Erro ${res.status}: ${res.statusText}`;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
          throw new Error(errorMessage);
        } catch (parseError) {
          throw new Error(errorMessage);
        }
      } else {
        const errorText = await res.text();
        throw new Error(errorMessage + (errorText ? ` - ${errorText}` : ''));
      }
    }
    
    // Para respostas bem-sucedidas
    if (contentType && contentType.includes('application/json')) {
      try {
        return await res.json() as T;
      } catch (error) {
        console.error('Erro ao fazer parse do JSON:', error);
        // Em caso de falha, retorna objeto vazio com sucesso:false como fallback seguro
        return { success: false, message: 'Erro ao processar resposta JSON do servidor' } as unknown as T;
      }
    } else {
      // Se a resposta não for JSON, retorna um objeto com a resposta em texto
      const text = await res.text();
      console.log('Resposta não-JSON recebida (provavelmente texto plano):', text.substring(0, 100));
      return { 
        success: true,
        statusCode: res.status,
        message: 'Operação realizada com sucesso',
        text: text
      } as unknown as T;
    }
  } catch (error) {
    console.error(`Erro na requisição ${method} para ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Verificar e normalizar o caminho da API
    const url = queryKey[0] as string;
    console.log(`Realizando query para ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Acesso não autorizado para ${url}. Retornando null conforme configurado.`);
        return null;
      }
  
      if (!res.ok) {
        // Tratar erros de forma mais detalhada
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || `Erro ${res.status}: ${res.statusText}`);
          } catch (parseError) {
            throw new Error(`Erro ${res.status}: ${res.statusText}`);
          }
        } else {
          const errorText = await res.text();
          throw new Error(`Erro ${res.status}: ${res.statusText} ${errorText ? `- ${errorText}` : ''}`);
        }
      }
      
      // Para respostas bem-sucedidas
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          return await res.json();
        } catch (error) {
          console.error('Erro ao fazer parse do JSON:', error);
          // Em caso de falha, retorna null
          return null;
        }
      } else {
        // Se a resposta não for JSON, retorna um objeto simples
        console.log(`Resposta não-JSON recebida na query para ${url}`);
        return null;
      }
    } catch (error) {
      console.error(`Erro na query para ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
