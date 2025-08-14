import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/ui/use-toast';

export interface RealtimeUpdate {
  type: 'video_started' | 'video_completed' | 'video_failed' | 'connection' | 'ping';
  assetId?: string;
  videoId?: string;
  templateId?: string;
  videoUrl?: string;
  gifUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  message?: string;
  timestamp: string;
}

interface UseRealtimeUpdatesProps {
  onVideoStarted?: (update: RealtimeUpdate) => void;
  onVideoCompleted?: (update: RealtimeUpdate) => void;
  onVideoFailed?: (update: RealtimeUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// Simple SSE connection manager
class SimpleSSEManager {
  private static instance: SimpleSSEManager;
  private connection: EventSource | null = null;
  private listeners: Set<(update: RealtimeUpdate) => void> = new Set();
  private connecting: boolean = false;

  static getInstance(): SimpleSSEManager {
    if (!SimpleSSEManager.instance) {
      SimpleSSEManager.instance = new SimpleSSEManager();
    }
    return SimpleSSEManager.instance;
  }

  connect(token: string, onMessage: (update: RealtimeUpdate) => void): EventSource | null {
    // Prevent multiple simultaneous connection attempts
    if (this.connecting) {
      console.log('SSE connection already in progress, skipping');
      return this.connection;
    }

    // If already connected, just add the listener
    if (this.connection && this.connection.readyState === EventSource.OPEN) {
      console.log('SSE already connected, adding new listener');
      this.listeners.add(onMessage);
      return this.connection;
    }

    // Close existing connection if any
    if (this.connection) {
      console.log('Closing existing SSE connection');
      this.connection.close();
      this.connection = null;
    }

    this.connecting = true;
    console.log('Creating new SSE connection...');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const url = `${backendUrl}/api/ai/heygen/updates?token=${encodeURIComponent(token)}`;
      
      this.connection = new EventSource(url);

      // Set up message handler
      this.connection.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);
          console.log('SSE message received:', update.type, 'listeners:', this.listeners.size);
          this.listeners.forEach(listener => {
            try {
              listener(update);
            } catch (error) {
              console.error('Error in listener callback:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      // Set up error handler
      this.connection.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.connecting = false;
      };

      // Set up open handler
      this.connection.onopen = () => {
        console.log('SSE connection established successfully');
        this.connecting = false;
      };

      // Add listener
      this.listeners.add(onMessage);
      console.log('SSE listener added, total listeners:', this.listeners.size);
      return this.connection;
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      this.connecting = false;
      return null;
    }
  }

  disconnect(onMessage?: (update: RealtimeUpdate) => void): void {
    if (onMessage) {
      this.listeners.delete(onMessage);
      console.log('SSE listener removed, remaining listeners:', this.listeners.size);
    } else {
      this.listeners.clear();
      console.log('All SSE listeners cleared');
    }

    if (this.connection && this.listeners.size === 0) {
      console.log('No more listeners, closing SSE connection');
      this.connection.close();
      this.connection = null;
      this.connecting = false;
    }
  }

  isConnected(): boolean {
    return this.connection !== null && this.connection.readyState === EventSource.OPEN;
  }

  isConnecting(): boolean {
    return this.connecting;
  }
}

export function useRealtimeUpdates({
  onVideoStarted,
  onVideoCompleted,
  onVideoFailed,
  onConnectionChange
}: UseRealtimeUpdatesProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const sseManager = SimpleSSEManager.getInstance();

  // Use refs to store the latest callback functions to avoid dependency issues
  const callbacksRef = useRef({
    onVideoStarted,
    onVideoCompleted,
    onVideoFailed,
    onConnectionChange
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onVideoStarted,
      onVideoCompleted,
      onVideoFailed,
      onConnectionChange
    };
  }, [onVideoStarted, onVideoCompleted, onVideoFailed, onConnectionChange]);

  const handleMessage = useCallback((update: RealtimeUpdate) => {
    setLastUpdate(update);

    switch (update.type) {
      case 'video_started':
        callbacksRef.current.onVideoStarted?.(update);
        break;

      case 'video_completed':
        callbacksRef.current.onVideoCompleted?.(update);
        break;

      case 'video_failed':
        callbacksRef.current.onVideoFailed?.(update);
        break;

      case 'connection':
        setIsConnected(true);
        setConnectionAttempts(0);
        callbacksRef.current.onConnectionChange?.(true);
        break;

      case 'ping':
        // Keep connection alive
        break;

      default:
        console.log('Unknown update type:', update.type);
    }
  }, []); // Empty dependency array since we use refs

  const connect = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found, skipping SSE connection');
      return;
    }

    // Prevent multiple connections
    if (sseManager.isConnected() || sseManager.isConnecting()) {
      console.log('SSE connection already exists or in progress, skipping new connection');
      return;
    }

    console.log('Attempting to establish SSE connection...');

    try {
      const eventSource = sseManager.connect(token, handleMessage);
      
      if (eventSource) {
        eventSource.onopen = () => {
          console.log('SSE connection opened successfully');
          setIsConnected(true);
          setConnectionAttempts(0);
          callbacksRef.current.onConnectionChange?.(true);
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setIsConnected(false);
          callbacksRef.current.onConnectionChange?.(false);

          // Attempt to reconnect with exponential backoff
          const maxAttempts = 5;
          const backoffDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
          
          if (connectionAttempts < maxAttempts) {
            console.log(`Reconnecting in ${backoffDelay}ms (attempt ${connectionAttempts + 1}/${maxAttempts})`);
            setConnectionAttempts(prev => prev + 1);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, backoffDelay);
          } else {
            console.log('Max reconnection attempts reached');
          }
        };
      }
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setIsConnected(false);
      callbacksRef.current.onConnectionChange?.(false);
    }
  }, [connectionAttempts, handleMessage]); // Removed onConnectionChange from dependencies

  const disconnect = useCallback(() => {
    console.log('Disconnecting SSE connection');
    sseManager.disconnect(handleMessage);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    callbacksRef.current.onConnectionChange?.(false);
  }, [handleMessage]); // Removed onConnectionChange from dependencies

  // Connect on mount and when auth token changes
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      console.log('useRealtimeUpdates: Initializing connection');
      connect();
    }

    // Listen for auth token changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          console.log('useRealtimeUpdates: Auth token changed, reconnecting');
          connect();
        } else {
          console.log('useRealtimeUpdates: Auth token removed, disconnecting');
          disconnect();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('useRealtimeUpdates: Cleaning up');
      disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [connect, disconnect]); // Include connect and disconnect in dependencies

  return {
    isConnected,
    lastUpdate,
    connect,
    disconnect
  };
}
