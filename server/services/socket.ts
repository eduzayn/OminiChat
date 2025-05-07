import { WebSocketServer, WebSocket } from 'ws';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Store connected clients by user ID
const clients: Map<number, WebSocket> = new Map();

// Store user roles for statistics
const clientRoles: Map<number, string> = new Map();

// Define o tipo específico do banco de dados
type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// Setup WebSocket server
export function setupWebSocketServer(wss: WebSocketServer, db: any): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    
    let userId: number | null = null;
    let userRole: string | null = null;
    
    // Handle messages from clients
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        const messageType = data.type;
        const messageData = data.data || {};
        
        console.log(`WebSocket message received: ${messageType}`);
        
        // Handle ping messages to keep connection alive
        if (messageType === 'ping') {
          console.log(`Recebido ping ${userId ? `do usuário ${userId}` : 'de cliente não autenticado'}`);
          
          // Marcar o cliente como vivo
          (ws as any).isAlive = true;
          
          // Verificar se é uma tentativa de recuperação (ping de emergência)
          const isRetry = messageData.retry === true;
          
          // Return a pong message with additional info
          try {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
              serverTime: new Date().toISOString(),
              clients: clients.size,
              clientId: userId || 'não autenticado',
              originalTimestamp: data.timestamp, // Devolver o timestamp do ping para cálculo de latência
              isRetryResponse: isRetry
            }));
          } catch (e) {
            console.error('Erro ao enviar resposta pong:', e);
          }
          return;
        }
        
        // Handle authentication
        if (messageType === 'authenticate') {
          const msgUserId = messageData.userId || null;
          
          // Garantir que userId seja um número válido
          if (typeof msgUserId === 'number') {
            userId = msgUserId;
            userRole = messageData.role || 'user';
            
            // Garantir que userRole nunca seja null
            if (!userRole) userRole = 'user';
            
            // Registrar esse cliente
            clients.set(userId, ws);
            clientRoles.set(userId, userRole); // Armazenar o papel do usuário
            console.log(`User ${userId} (${userRole}) authenticated`);
            
            // Send confirmation to client
            ws.send(JSON.stringify({
              type: 'authentication_success',
              data: { userId, userRole }
            }));
            
            // Send online status to other users
            broadcastToClients({
              type: 'user_status',
              data: {
                userId,
                isOnline: true,
                timestamp: new Date().toISOString()
              }
            });
            
            // Update user status in database usando Drizzle ORM
            try {
              // Uso de promises em vez de await
              db.update(schema.users)
                .set({ 
                  isOnline: true, 
                  lastSeen: new Date() 
                })
                .where(eq(schema.users.id, userId))
                .execute()
                .then(() => {
                  console.log(`User ${userId} marked as online in database`);
                })
                .catch((error: unknown) => {
                  console.error('Error updating user online status:', error);
                });
            } catch (error) {
              console.error('Error updating user online status:', error);
            }
          } else {
            console.error('Invalid userId received:', msgUserId);
            ws.send(JSON.stringify({
              type: 'authentication_error',
              data: { message: 'Invalid user ID' }
            }));
          }
        }
        
        // Handle conversation events
        else if (messageType === 'conversation_opened') {
          console.log(`User ${userId} opened conversation ${messageData.conversationId}`);
          
          // Notify other agent(s) that this conversation is being viewed
          broadcastToClients({
            type: 'conversation_status',
            data: {
              conversationId: messageData.conversationId,
              status: 'active',
              viewingAgentId: userId,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        else if (messageType === 'conversation_closed') {
          console.log(`User ${userId} closed conversation ${messageData.conversationId}`);
          
          // Notify other clients
          broadcastToClients({
            type: 'conversation_status',
            data: {
              conversationId: messageData.conversationId,
              status: 'inactive',
              viewingAgentId: null,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Handle typing status
        else if (messageType === 'typing_status') {
          // Broadcast typing status to all clients
          broadcastToClients({
            type: 'typing_status',
            data: {
              conversationId: messageData.conversationId,
              isTyping: messageData.isTyping,
              isAgent: messageData.isAgent,
              agentId: messageData.agentId,
              agentName: messageData.agentName,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Handle new notifications
        else if (messageType === 'notification') {
          console.log('Recebida notificação:', messageData);
          // Route notification to specific user or broadcast
          if (messageData.targetUserId) {
            sendToUser(messageData.targetUserId, {
              type: 'notification',
              data: messageData
            });
          } else {
            broadcastToClients({
              type: 'notification',
              data: messageData
            });
          }
        }
        
        // Handle Z-API direct test via WebSocket
        else if (messageType === 'zapiDirectTest') {
          console.log(`[ZAPI-WS-Test] Solicitação de teste direto Z-API recebida de usuário ${userId}`);
          
          // Realizar um teste simples de conectividade com a Z-API
          try {
            const axios = require('axios');
            
            // Obter credenciais
            const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "3DF871A7ADFB20FB49998E66062CE0C1";
            const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "A4E42029C248B72DA0842F47";
            const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
            
            // URL base para requisições
            const BASE_URL = "https://api.z-api.io";
            
            // Endpoint para verificar status da instância
            const statusEndpoint = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/status`;
            
            // Configurar headers
            const headers = {
              'Content-Type': 'application/json'
            };
            
            if (ZAPI_CLIENT_TOKEN) {
              headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
            }
            
            // Executar a requisição e retornar o resultado via WebSocket
            axios.get(statusEndpoint, { headers })
              .then(response => {
                console.log(`[ZAPI-WS-Test] Resposta da Z-API:`, response.data);
                
                // Enviar resposta ao cliente via WebSocket
                if (userId) {
                  sendToUser(userId, {
                    type: 'zapiDirectTestResult',
                    data: {
                      success: true,
                      message: "Teste Z-API via WebSocket bem-sucedido",
                      timestamp: new Date().toISOString(),
                      responseData: response.data
                    }
                  });
                }
              })
              .catch(error => {
                console.error(`[ZAPI-WS-Test] Erro na requisição:`, error);
                
                // Preparar dados do erro para envio via WebSocket
                const errorData = {
                  message: error.message,
                  status: error.response?.status,
                  data: error.response?.data
                };
                
                // Enviar resposta de erro ao cliente
                if (userId) {
                  sendToUser(userId, {
                    type: 'zapiDirectTestResult',
                    data: {
                      success: false,
                      message: "Erro na requisição Z-API via WebSocket",
                      error: errorData,
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              });
          } catch (error) {
            console.error(`[ZAPI-WS-Test] Erro geral:`, error);
            
            // Enviar resposta de erro ao cliente
            if (userId) {
              sendToUser(userId, {
                type: 'zapiDirectTestResult',
                data: {
                  success: false,
                  message: "Erro ao realizar teste Z-API via WebSocket",
                  error: error instanceof Error ? error.message : "Erro desconhecido",
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        }
        
        // Handle video test request via WebSocket
        else if (messageType === 'zapiSendVideo') {
          console.log(`[ZAPI-Video-WS] Solicitação de envio de vídeo recebida de usuário ${userId}`);
          
          // Extrair dados da mensagem
          const { to, videoUrl, caption } = messageData;
          
          if (!to || !videoUrl) {
            // Responder com erro se dados estiverem incompletos
            if (userId) {
              sendToUser(userId, {
                type: 'zapiSendVideoResult',
                data: {
                  success: false,
                  message: "Dados incompletos. Número e URL do vídeo são obrigatórios",
                  timestamp: new Date().toISOString()
                }
              });
            }
            return;
          }
          
          try {
            const axios = require('axios');
            
            // Obter credenciais
            const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "3DF871A7ADFB20FB49998E66062CE0C1";
            const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "A4E42029C248B72DA0842F47";
            const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
            const BASE_URL = "https://api.z-api.io";
            
            // Formatação do número
            let formattedPhone = to.replace(/\D/g, '');
            if (formattedPhone.length <= 11) {
              formattedPhone = `55${formattedPhone}`;
            }
            
            // Headers para requisição
            const headers = {
              'Content-Type': 'application/json'
            };
            
            if (ZAPI_CLIENT_TOKEN) {
              headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
            }
            
            // Tentar métodos diferentes, um após o outro
            console.log(`[ZAPI-Video-WS] Iniciando tentativas de envio para ${formattedPhone}`);
            
            // Função para tentar cada método
            const tryMethods = async () => {
              let results = [];
              let success = false;
              
              // Tentativa 1: Usando linkVideo
              try {
                console.log("[ZAPI-Video-WS] Tentativa 1: Usando campo 'linkVideo'");
                const url1 = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-video`;
                
                const response1 = await axios.post(url1, {
                  phone: formattedPhone,
                  linkVideo: videoUrl,
                  caption: caption || ''
                }, { headers });
                
                results.push({
                  method: "linkVideo",
                  success: true,
                  data: response1.data
                });
                
                success = true;
              } catch (error1) {
                results.push({
                  method: "linkVideo",
                  success: false,
                  error: error1.message,
                  response: error1.response?.data
                });
              }
              
              // Tentativa 2: Usando campo 'video'
              if (!success) {
                try {
                  console.log("[ZAPI-Video-WS] Tentativa 2: Usando campo 'video'");
                  const url2 = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-video`;
                  
                  const response2 = await axios.post(url2, {
                    phone: formattedPhone,
                    video: videoUrl,
                    caption: caption || ''
                  }, { headers });
                  
                  results.push({
                    method: "video",
                    success: true,
                    data: response2.data
                  });
                  
                  success = true;
                } catch (error2) {
                  results.push({
                    method: "video",
                    success: false,
                    error: error2.message,
                    response: error2.response?.data
                  });
                }
              }
              
              // Tentativa 3: Usando endpoint genérico send-media
              if (!success) {
                try {
                  console.log("[ZAPI-Video-WS] Tentativa 3: Usando endpoint 'send-media'");
                  const url3 = `${BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-media`;
                  
                  const response3 = await axios.post(url3, {
                    phone: formattedPhone,
                    url: videoUrl,
                    type: 'video',
                    caption: caption || ''
                  }, { headers });
                  
                  results.push({
                    method: "send-media",
                    success: true,
                    data: response3.data
                  });
                  
                  success = true;
                } catch (error3) {
                  results.push({
                    method: "send-media",
                    success: false,
                    error: error3.message,
                    response: error3.response?.data
                  });
                }
              }
              
              return { success, results };
            };
            
            // Executar as tentativas e responder ao cliente
            tryMethods().then(({ success, results }) => {
              console.log(`[ZAPI-Video-WS] Tentativas concluídas. Sucesso: ${success}`);
              
              if (userId) {
                sendToUser(userId, {
                  type: 'zapiSendVideoResult',
                  data: {
                    success,
                    message: success ? "Vídeo enviado com sucesso" : "Falha ao enviar vídeo em todas as tentativas",
                    results,
                    timestamp: new Date().toISOString()
                  }
                });
              }
            }).catch(error => {
              console.error(`[ZAPI-Video-WS] Erro geral nas tentativas:`, error);
              
              if (userId) {
                sendToUser(userId, {
                  type: 'zapiSendVideoResult',
                  data: {
                    success: false,
                    message: "Erro interno ao processar tentativas de envio de vídeo",
                    error: error instanceof Error ? error.message : "Erro desconhecido",
                    timestamp: new Date().toISOString()
                  }
                });
              }
            });
          } catch (error) {
            console.error(`[ZAPI-Video-WS] Erro geral:`, error);
            
            if (userId) {
              sendToUser(userId, {
                type: 'zapiSendVideoResult',
                data: {
                  success: false,
                  message: "Erro ao processar solicitação de envio de vídeo",
                  error: error instanceof Error ? error.message : "Erro desconhecido",
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
      if (userId) {
        // Update user status
        broadcastToClients({
          type: 'user_status',
          data: {
            userId,
            isOnline: false,
            timestamp: new Date().toISOString()
          }
        });
        
        // Remove from active clients
        clients.delete(userId);
        
        // Update database
        try {
          // Atualiza o status do usuário usando o Drizzle ORM em vez de SQL direto
          if (userId) {
            // Uso de promises em vez de await
            db.update(schema.users)
              .set({ 
                isOnline: false, 
                lastSeen: new Date() 
              })
              .where(eq(schema.users.id, userId))
              .execute()
              .then(() => {
                console.log(`User ${userId} marked as offline in database`);
              })
              .catch((err: unknown) => {
                console.error('Error updating user offline status:', err);
              });
          }
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send initial welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Conectado ao servidor OmniConnect. Aguardando autenticação...'
    }));
  });
  
  // Inicializar o estado de cada conexão WebSocket
  wss.clients.forEach((ws: WebSocket) => {
    (ws as any).isAlive = true;
  });
  
  // Monitoramento avançado de clientes e keep-alive com ping/pong
  const pingInterval = setInterval(() => {
    if (wss.clients.size === 0) {
      console.log('Nenhum cliente conectado para ping');
      return;
    }
    
    console.log(`Realizando ping em ${wss.clients.size} clientes WebSocket`);
    
    wss.clients.forEach((ws: WebSocket) => {
      // Verificar se o cliente está aberto antes de enviar ping
      if (ws.readyState === WebSocket.OPEN) {
        // Marcar o cliente como não responsivo até que responda ao ping
        (ws as any).isAlive = false;
        (ws as any).pingAttempts = ((ws as any).pingAttempts || 0) + 1;
        
        try {
          // Enviar ping (protocolo WebSocket nativo)
          ws.ping();
          
          // Enviar ping como mensagem JSON também (alternativa para alguns clientes que não respondem ao ping nativo)
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
          }));
          
          // Se o cliente atingiu muitas tentativas, registra um aviso
          if ((ws as any).pingAttempts > 2) {
            console.warn(`Cliente com ${(ws as any).pingAttempts} tentativas de ping sem sucesso`);
          }
        } catch (error: unknown) {
          console.error('Erro ao enviar ping:', error);
          // Se não conseguir enviar ping, a conexão provavelmente está quebrada
          console.log('Terminando conexão devido a erro no ping');
          try {
            ws.terminate();
          } catch (e) {
            console.error('Erro ao terminar WebSocket após falha de ping:', e);
          }
        }
      }
    });
  }, 20000); // Ping a cada 20 segundos (mais frequente)
  
  // Verificar clientes não responsivos e remover
  const terminateInterval = setInterval(() => {
    let terminatedCount = 0;
    
    wss.clients.forEach((ws: WebSocket) => {
      // Se o cliente não respondeu ao último ping e está aberto, desconectar
      if ((ws as any).isAlive === false && ws.readyState === WebSocket.OPEN) {
        // Se tem muitas tentativas sem resposta ou estado inválido
        if ((ws as any).pingAttempts >= 3 || ws.readyState !== WebSocket.OPEN) {
          console.log('Terminando conexão de cliente não responsivo');
          try {
            ws.terminate();
            terminatedCount++;
          } catch (e) {
            console.error('Erro ao terminar conexão não responsiva:', e);
          }
        }
      }
    });
    
    if (terminatedCount > 0) {
      console.log(`Terminadas ${terminatedCount} conexões não responsivas`);
    }
  }, 30000); // Verificar a cada 30 segundos (após ciclo de ping)
  
  // Configurar callback de pong para marcar clientes como responsivos
  wss.on('connection', (ws: WebSocket) => {
    // Adicionar listener de pong para cada conexão individual
    ws.on('pong', () => {
      // Quando um pong é recebido, marcar o cliente como vivo
      (ws as any).isAlive = true;
      console.log('Pong recebido de cliente WebSocket');
    });
  });
  
  // Clean up on server close
  wss.on('close', () => {
    clearInterval(pingInterval);
    clearInterval(terminateInterval);
    clients.clear();
  });
  
  console.log('WebSocket server initialized');
}

// Broadcast message to all connected clients
export function broadcastToClients(data: any): void {
  console.log(`Broadcasting to ${clients.size} clients:`, JSON.stringify(data).substring(0, 200) + "...");
  
  clients.forEach((client, userId) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
        console.log(`Mensagem enviada para cliente ${userId}`);
      } catch (error) {
        console.error(`Erro ao enviar para cliente ${userId}:`, error);
      }
    } else {
      console.log(`Cliente ${userId} não está pronto para receber (readyState: ${client.readyState})`);
    }
  });
}

// Send message to specific user
export function sendToUser(userId: number, data: any): void {
  console.log(`Tentando enviar mensagem para usuário ${userId}:`, 
              JSON.stringify(data).substring(0, 200) + "...");
              
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(data));
      console.log(`Mensagem enviada para usuário ${userId} com sucesso`);
    } catch (error) {
      console.error(`Erro ao enviar mensagem para usuário ${userId}:`, error);
    }
  } else {
    console.log(`Usuário ${userId} não está conectado ou não está pronto para receber mensagens`);
  }
}



// Get active clients count
export function getActiveClientsCount(): number {
  return clients.size;
}

// Check if user is connected
export function isUserConnected(userId: number): boolean {
  const client = clients.get(userId);
  return client !== undefined && client.readyState === WebSocket.OPEN;
}

// Send connection statistics to all clients
export function broadcastConnectionStats(): void {
  // Coletar estatísticas sobre clientes conectados
  let authenticatedClients = 0;
  let adminClients = 0;
  let userClients = 0;
  
  // Verificar clientes com diferentes papéis
  clientRoles.forEach((role, userId) => {
    if (clients.has(userId) && clients.get(userId)?.readyState === WebSocket.OPEN) {
      authenticatedClients++;
      
      if (role === 'admin') {
        adminClients++;
      } else {
        userClients++;
      }
    }
  });
  
  // Broadcast das estatísticas
  broadcastToClients({
    type: 'connection_stats',
    data: {
      total: clients.size,
      authenticated: authenticatedClients,
      admins: adminClients,
      users: userClients,
      anonymous: clients.size - authenticatedClients,
      timestamp: new Date().toISOString()
    }
  });
}