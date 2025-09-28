import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
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
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.socket?.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
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
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: socket not connected`);
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

// Export the socket instance for direct use
export const socket = socketManager.connect();

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