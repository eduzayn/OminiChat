// Create a websocket connection to the server
export function createWebSocket(): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  const socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log("WebSocket connection established");
  };
  
  socket.onclose = () => {
    console.log("WebSocket connection closed");
  };
  
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  return socket;
}

// Send a message to the server
export function sendSocketMessage(socket: WebSocket, type: string, data: any): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
  } else {
    console.error("WebSocket is not open. Message not sent.");
  }
}

// Add a typed event listener
export function addSocketListener(
  socket: WebSocket,
  messageType: string,
  callback: (data: any) => void
): () => void {
  const handler = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === messageType) {
        callback(message.data);
      }
    } catch (error) {
      console.error("Error parsing socket message:", error);
    }
  };
  
  socket.addEventListener("message", handler);
  
  // Return a function to remove the listener
  return () => {
    socket.removeEventListener("message", handler);
  };
}
