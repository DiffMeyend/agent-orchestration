#!/usr/bin/env node
/**
 * HTTP Server Entry Point for MCP
 *
 * Alternative to stdio-based server.ts for external AI runners.
 *
 * Usage:
 *   SLATE_HTTP_PORT=3100 node dist/http-server.js
 *
 * Environment Variables:
 *   SLATE_HTTP_PORT - Port to listen on (default: 3100)
 *   SLATE_HTTP_HOST - Host to bind to (default: 127.0.0.1)
 *   SLATE_RPC_TOKEN - Optional authentication token
 *   SLATE_CORS_ORIGINS - Comma-separated list of allowed origins
 *
 * Example:
 *   curl -X POST http://localhost:3100/rpc \
 *     -H "Content-Type: application/json" \
 *     -d '{"jsonrpc":"2.0","id":1,"method":"slate.get_state"}'
 */

import { createHttpTransport, type HttpTransportConfig } from "./http-transport.js";
import { handleRequest } from "./server.js";
import { initHistory } from "./history.js";
import { appendLog } from "./logs.js";

// Initialize history on startup
initHistory();

// Parse configuration from environment
const config: HttpTransportConfig = {
  port: parseInt(process.env.SLATE_HTTP_PORT || "3100", 10),
  host: process.env.SLATE_HTTP_HOST || "127.0.0.1",
  rpcToken: process.env.SLATE_RPC_TOKEN?.trim(),
  corsOrigins: process.env.SLATE_CORS_ORIGINS
    ? process.env.SLATE_CORS_ORIGINS.split(",").map(s => s.trim())
    : ["*"]
};

// Create and start transport
const transport = createHttpTransport(handleRequest, config);

transport.start().then(() => {
  appendLog({
    level: "info",
    category: "startup",
    message: `SLATE MCP HTTP server started`,
    data: { port: config.port, host: config.host }
  });
}).catch((err) => {
  console.error("[slate-mcp] Failed to start HTTP server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.error("\n[slate-mcp] Shutting down...");
  await transport.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await transport.stop();
  process.exit(0);
});
