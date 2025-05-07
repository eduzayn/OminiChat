declare namespace NodeJS {
  interface Global {
    wss: import('ws').WebSocketServer;
    broadcastToClients: (data: any) => void;
  }
}