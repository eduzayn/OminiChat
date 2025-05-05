import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
  }
): Promise<T> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Verificar o content-type para fazer o parse adequado
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch (error) {
      console.error('Erro ao fazer parse do JSON:', error);
      // Em caso de falha, retorna objeto vazio com sucesso:false como fallback seguro
      return { success: false, message: 'Erro ao processar resposta do servidor' } as unknown as T;
    }
  } else {
    // Se a resposta não for JSON, retorna um objeto com a resposta em texto
    const text = await res.text();
    console.log('Resposta não-JSON recebida:', text);
    return { 
      success: res.ok,
      statusCode: res.status,
      message: res.ok ? 'Operação realizada com sucesso' : 'Erro na operação' 
    } as unknown as T;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Verificar o content-type para fazer o parse adequado
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
      console.log('Resposta não-JSON recebida na query');
      return null;
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
