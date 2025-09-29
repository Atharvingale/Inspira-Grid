/**
 * Utility functions to check server availability before attempting socket connections
 */

/**
 * Check if a server is available at the given URL
 */
export async function checkServerAvailability(url: string, timeout: number = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url + '/health', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if socket server is available
 */
export async function checkSocketServerAvailability(): Promise<boolean> {
  const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  // Don't check if sockets are disabled
  if (process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true' || 
      process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'false') {
    return false;
  }
  
  return await checkServerAvailability(socketUrl);
}

/**
 * Get the appropriate socket configuration based on environment and server availability
 */
export async function getSocketConfig(): Promise<{
  shouldConnect: boolean;
  serverUrl?: string;
  config?: any;
}> {
  // Check if sockets should be disabled
  if (process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true' || 
      process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'false') {
    console.log('🔌 Sockets disabled via environment variables');
    return { shouldConnect: false };
  }
  
  const serverUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  // In development, check if server is actually available
  if (process.env.NODE_ENV === 'development') {
    const serverAvailable = await checkServerAvailability(serverUrl);
    
    if (!serverAvailable) {
      console.log('🔌 Socket server not available - real-time features disabled');
      return { shouldConnect: false };
    }
  }
  
  // Return socket configuration
  return {
    shouldConnect: true,
    serverUrl,
    config: {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3, // Reduced from 5
      reconnectionDelay: 2000,  // Increased from 1000
      reconnectionDelayMax: 10000, // Increased from 5000
      maxReconnectionAttempts: 3,
    }
  };
}