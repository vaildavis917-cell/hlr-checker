import { useEffect, useRef, useState, useCallback } from "react";

interface BatchProgress {
  batchId: number;
  processed: number;
  total: number;
  valid?: number;
  invalid?: number;
  percentage: number;
  status: "processing" | "completed" | "error";
  currentItem?: string;
  error?: string;
  timestamp: number;
}

interface UseWebSocketOptions {
  userId?: number;
  onProgress?: (progress: BatchProgress) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { userId, onProgress, onConnected, onDisconnected } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedBatchId, setSubscribedBatchId] = useState<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnected?.();

        // Authenticate if userId is provided
        if (userId) {
          ws.send(JSON.stringify({ type: "auth", userId }));
        }

        // Re-subscribe to batch if we had one
        if (subscribedBatchId) {
          ws.send(JSON.stringify({ type: "subscribe_batch", batchId: subscribedBatchId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "batch_progress") {
            onProgress?.(message as BatchProgress);
          }
        } catch (error) {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnected?.();
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        // Error handling is done in onclose
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
    }
  }, [userId, subscribedBatchId, onProgress, onConnected, onDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent reconnection
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const subscribeToBatch = useCallback((batchId: number) => {
    setSubscribedBatchId(batchId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe_batch", batchId }));
    }
  }, []);

  const unsubscribeFromBatch = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && subscribedBatchId) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe_batch" }));
    }
    setSubscribedBatchId(null);
  }, [subscribedBatchId]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    subscribeToBatch,
    unsubscribeFromBatch,
    subscribedBatchId,
    reconnect: connect,
  };
}

// Simpler hook for just tracking batch progress
export function useBatchProgress(batchId: number | null, userId?: number) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  const { subscribeToBatch, unsubscribeFromBatch, isConnected } = useWebSocket({
    userId,
    onProgress: (p) => {
      if (p.batchId === batchId) {
        setProgress(p);
      }
    },
  });

  useEffect(() => {
    if (batchId && isConnected) {
      subscribeToBatch(batchId);
      return () => {
        unsubscribeFromBatch();
      };
    }
  }, [batchId, isConnected, subscribeToBatch, unsubscribeFromBatch]);

  return progress;
}
