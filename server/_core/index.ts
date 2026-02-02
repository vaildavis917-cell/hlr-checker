import "dotenv/config";
import express from "express";
import { createServer, Server } from "http";
import net from "net";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// Global state for graceful shutdown
let isShuttingDown = false;
let httpServer: Server | null = null;
const activeRequests = new Set<string>();

// Track active batch processing
export const activeBatches = new Map<number, {
  batchId: number;
  processedCount: number;
  totalCount: number;
  startedAt: Date;
}>();

// Register active batch for graceful shutdown tracking
export function registerActiveBatch(batchId: number, totalCount: number) {
  activeBatches.set(batchId, {
    batchId,
    processedCount: 0,
    totalCount,
    startedAt: new Date(),
  });
}

// Update batch progress
export function updateBatchProgress(batchId: number, processedCount: number) {
  const batch = activeBatches.get(batchId);
  if (batch) {
    batch.processedCount = processedCount;
  }
}

// Unregister completed batch
export function unregisterBatch(batchId: number) {
  activeBatches.delete(batchId);
}

// Check if shutdown is in progress
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Run database migrations automatically
async function runMigrations() {
  try {
    console.log("[Database] Running migrations...");
    const { stdout, stderr } = await execAsync("pnpm db:push", {
      cwd: process.cwd(),
      timeout: 60000, // 60 second timeout
    });
    if (stdout) console.log("[Database] Migration output:", stdout);
    if (stderr && !stderr.includes("No config path")) {
      console.warn("[Database] Migration warnings:", stderr);
    }
    console.log("[Database] Migrations completed successfully");
  } catch (error: any) {
    // Don't fail startup if migrations fail - DB might already be up to date
    console.warn("[Database] Migration warning:", error.message || error);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log("[Shutdown] Already shutting down, ignoring signal:", signal);
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`);
  
  // Log active batches that will be interrupted
  if (activeBatches.size > 0) {
    console.log(`[Shutdown] Active batches that will be paused:`);
    activeBatches.forEach((batch) => {
      console.log(`  - Batch #${batch.batchId}: ${batch.processedCount}/${batch.totalCount} processed`);
    });
    console.log(`[Shutdown] These batches can be resumed after restart via the UI.`);
  }
  
  // Stop accepting new connections
  if (httpServer) {
    console.log("[Shutdown] Stopping HTTP server...");
    httpServer.close((err) => {
      if (err) {
        console.error("[Shutdown] Error closing server:", err);
      } else {
        console.log("[Shutdown] HTTP server closed");
      }
    });
  }
  
  // Wait for active requests to complete (max 30 seconds)
  const shutdownTimeout = 30000;
  const startTime = Date.now();
  
  while (activeRequests.size > 0 && Date.now() - startTime < shutdownTimeout) {
    console.log(`[Shutdown] Waiting for ${activeRequests.size} active requests...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (activeRequests.size > 0) {
    console.log(`[Shutdown] Timeout reached, ${activeRequests.size} requests will be terminated`);
  }
  
  console.log("[Shutdown] Graceful shutdown complete");
  process.exit(0);
}

async function startServer() {
  // Run migrations before starting server
  await runMigrations();
  
  const app = express();
  const server = createServer(app);
  httpServer = server;
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Request tracking middleware for graceful shutdown
  app.use((req, res, next) => {
    if (isShuttingDown) {
      res.status(503).json({ error: "Server is shutting down" });
      return;
    }
    
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeRequests.add(requestId);
    
    res.on("finish", () => {
      activeRequests.delete(requestId);
    });
    
    res.on("close", () => {
      activeRequests.delete(requestId);
    });
    
    next();
  });
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: isShuttingDown ? "shutting_down" : "healthy",
      uptime: process.uptime(),
      activeBatches: activeBatches.size,
      activeRequests: activeRequests.size,
      timestamp: new Date().toISOString(),
    });
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  
  // Register shutdown handlers
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));
  
  // Handle uncaught exceptions gracefully
  process.on("uncaughtException", (error) => {
    console.error("[Error] Uncaught exception:", error);
    gracefulShutdown("uncaughtException");
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[Error] Unhandled rejection at:", promise, "reason:", reason);
  });
}

startServer().catch(console.error);
