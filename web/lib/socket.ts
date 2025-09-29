import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string): Socket | null {
    // Check if sockets should be disabled
    if (process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true') {
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    const serverUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      auth: token ? { token } : undefined,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      // Handle disconnect
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.socket?.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      // Handle socket error
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      // Handle reconnection failure
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Utility methods for common socket operations
  emit(event: string, data?: any) {
    if (process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true') {
      return; // Silently ignore when disabled
    }
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }
}

// Create a singleton instance
const socketManager = new SocketManager();

// Export the socket instance for direct use (may be null if disabled)
const socketInstance = socketManager.connect();
export const socket = socketInstance;

// Export the manager for advanced control
export default socketManager;

// Export types for better TypeScript support
export interface ServerToClientEvents {
  'message:new': (message: any) => void;
  'message:updated': (message: any) => void;
  'message:deleted': (data: { conversationId: string; messageId: string }) => void;
  'user:online': (user: any) => void;
  'user:offline': (userId: string) => void;
  'typing:start': (data: { conversationId: string; userId: string; userName: string }) => void;
  'typing:stop': (data: { conversationId: string; userId: string }) => void;
  'conversation:updated': (conversation: any) => void;
  'notification': (notification: any) => void;
}

export interface ClientToServerEvents {
  'message:send': (message: any) => void;
  'message:edit': (data: { messageId: string; content: string }) => void;
  'message:delete': (data: { conversationId: string; messageId: string }) => void;
  'typing:start': (data: { conversationId: string; userId: string; userName: string }) => void;
  'typing:stop': (data: { conversationId: string; userId: string }) => void;
  'conversation:join': (conversationId: string) => void;
  'conversation:leave': (conversationId: string) => void;
  'user:status': (status: 'online' | 'offline' | 'away') => void;
}