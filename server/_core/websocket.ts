import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { IncomingMessage } from "http";
import { Duplex } from "stream";

// Store connected clients by userId
const clients = new Map<number, Set<WebSocket>>();

// Store batch progress subscribers (batchId -> Set of WebSocket)
const batchSubscribers = new Map<number, Set<WebSocket>>();

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
  // Create WebSocket server in noServer mode to avoid conflicts with Vite HMR
  wss = new WebSocketServer({ noServer: true });

  // Only handle upgrade requests for /ws path
  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    
    if (url.pathname === "/ws") {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
    // Don't handle other paths - let Vite HMR handle them
  });

  wss.on("connection", (ws: WebSocket) => {
    let userId: number | null = null;
    let subscribedBatchId: number | null = null;

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle authentication
        if (message.type === "auth" && message.userId) {
          userId = message.userId;
          const userIdNum = userId as number;
          if (!clients.has(userIdNum)) {
            clients.set(userIdNum, new Set());
          }
          clients.get(userIdNum)!.add(ws);
          ws.send(JSON.stringify({ type: "auth_success", userId: userIdNum }));
        }

        // Handle batch subscription
        if (message.type === "subscribe_batch" && message.batchId) {
          subscribedBatchId = message.batchId;
          const batchIdNum = subscribedBatchId as number;
          if (!batchSubscribers.has(batchIdNum)) {
            batchSubscribers.set(batchIdNum, new Set());
          }
          batchSubscribers.get(batchIdNum)!.add(ws);
          ws.send(JSON.stringify({ type: "subscribed", batchId: batchIdNum }));
        }

        // Handle unsubscribe
        if (message.type === "unsubscribe_batch" && subscribedBatchId) {
          const subscribers = batchSubscribers.get(subscribedBatchId);
          if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
              batchSubscribers.delete(subscribedBatchId);
            }
          }
          subscribedBatchId = null;
        }
      } catch (error) {
        // Ignore invalid messages
      }
    });

    ws.on("close", () => {
      // Remove from clients
      if (userId !== null) {
        const userClients = clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            clients.delete(userId);
          }
        }
      }

      // Remove from batch subscribers
      if (subscribedBatchId !== null) {
        const subscribers = batchSubscribers.get(subscribedBatchId);
        if (subscribers) {
          subscribers.delete(ws);
          if (subscribers.size === 0) {
            batchSubscribers.delete(subscribedBatchId);
          }
        }
      }
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Client error:", error.message);
    });
  });

  console.log("[WebSocket] Server initialized on /ws (noServer mode)");
}

// Send progress update to all subscribers of a batch
export function broadcastBatchProgress(
  batchId: number,
  data: {
    processed: number;
    total: number;
    valid?: number;
    invalid?: number;
    status: "processing" | "completed" | "error";
    currentItem?: string;
    error?: string;
  }
) {
  const subscribers = batchSubscribers.get(batchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify({
    type: "batch_progress",
    batchId,
    ...data,
    percentage: Math.round((data.processed / data.total) * 100),
    timestamp: Date.now(),
  });

  subscribers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Send notification to specific user
export function sendToUser(userId: number, data: any) {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const message = JSON.stringify(data);

  userClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Get WebSocket server stats
export function getWebSocketStats() {
  return {
    connectedClients: Array.from(clients.values()).reduce((sum, set) => sum + set.size, 0),
    activeSubscriptions: batchSubscribers.size,
    userCount: clients.size,
  };
}

// Close all connections (for graceful shutdown)
export function closeAllConnections() {
  if (wss) {
    wss.clients.forEach((ws) => {
      ws.close(1001, "Server shutting down");
    });
    wss.close();
  }
}
