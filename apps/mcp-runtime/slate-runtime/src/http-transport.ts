/**
 * HTTP Transport for MCP Server
 *
 * Provides HTTP endpoint for external AI runners (Codex, ChatGPT, etc.)
 * to interact with SLATE MCP methods.
 *
 * Usage:
 *   SLATE_HTTP_PORT=3100 node dist/http-server.js
 *
 * Endpoints:
 *   POST /rpc - JSON-RPC 2.0 endpoint
 *   GET /health - Health check
 *   GET /methods - List available methods
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appendLog } from "./logs.js";

export interface HttpTransportConfig {
  port: number;
  host?: string;
  corsOrigins?: string[];
  rpcToken?: string;
}

// Import types from server.ts to ensure compatibility
import type { JsonRpcRequest, JsonRpcResponse } from "./server.js";

export type { JsonRpcRequest, JsonRpcResponse };

export type RequestHandler = (req: JsonRpcRequest) => Promise<JsonRpcResponse>;

/**
 * Create HTTP transport server
 */
export function createHttpTransport(
  handleRequest: RequestHandler,
  config: HttpTransportConfig
) {
  const { port, host = "127.0.0.1", corsOrigins = [], rpcToken } = config;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    const origin = req.headers.origin || "*";
    if (corsOrigins.length === 0 || corsOrigins.includes(origin) || corsOrigins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-RPC-Token");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", transport: "http" }));
      return;
    }

    // List methods
    if (req.method === "GET" && req.url === "/methods") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        methods: AVAILABLE_METHODS,
        transport: "http",
        documentation: "https://github.com/your-org/slate/docs/mcp"
      }));
      return;
    }

    // RPC endpoint
    if (req.method === "POST" && (req.url === "/rpc" || req.url === "/")) {
      // Check authentication if configured
      if (rpcToken) {
        const providedToken =
          req.headers["x-rpc-token"] ||
          req.headers.authorization?.replace("Bearer ", "");

        if (providedToken !== rpcToken) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: 401, message: "Unauthorized: Invalid or missing RPC token" }
          }));
          return;
        }
      }

      // Parse body
      let body = "";
      for await (const chunk of req) {
        body += chunk;
      }

      let rpcRequest: JsonRpcRequest;
      try {
        rpcRequest = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: Invalid JSON" }
        }));
        return;
      }

      // Validate JSON-RPC request
      if (rpcRequest.jsonrpc !== "2.0" || !rpcRequest.method) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: rpcRequest.id ?? null,
          error: { code: -32600, message: "Invalid Request: Missing jsonrpc or method" }
        }));
        return;
      }

      // Log incoming request
      appendLog({
        level: "info",
        category: "http",
        message: `HTTP RPC: ${rpcRequest.method}`,
        data: { id: rpcRequest.id }
      });

      // Handle request
      const response = await handleRequest(rpcRequest);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "Not Found",
      endpoints: {
        "POST /rpc": "JSON-RPC 2.0 endpoint",
        "GET /health": "Health check",
        "GET /methods": "List available methods"
      }
    }));
  });

  return {
    start: () => {
      return new Promise<void>((resolve, reject) => {
        server.on("error", reject);
        server.listen(port, host, () => {
          appendLog({
            level: "info",
            category: "http",
            message: `HTTP transport listening on ${host}:${port}`
          });
          console.error(`[slate-mcp] HTTP transport listening on http://${host}:${port}`);
          resolve();
        });
      });
    },
    stop: () => {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    server
  };
}

/**
 * Available MCP methods
 */
export const AVAILABLE_METHODS = [
  // State Management
  "slate.set_state",
  "slate.get_state",
  "slate.set_mode",
  "slate.get_mode",
  "slate.decide_autonomy",

  // Context & CSS
  "slate.calculate_css",
  "slate.get_snippet",
  "slate.list_snippets",
  "slate.route_task",

  // Worktree Management
  "slate.create_worktree",
  "slate.get_worktree",
  "slate.list_worktrees",
  "slate.cleanup_worktree",
  "slate.gate_merge",

  // Artifact Storage
  "slate.register_artifact",
  "slate.query_artifacts",
  "slate.get_artifact",
  "slate.get_artifact_chain",

  // Session Management
  "slate.create_session",
  "slate.get_session",
  "slate.list_sessions",
  "slate.start_session",
  "slate.advance_session",
  "slate.complete_session",
  "slate.fail_session",
  "slate.get_session_artifact",
  "slate.get_session_lineage",

  // Permissions
  "slate.enforce_perms",

  // Agent Execution
  "slate.run_agent",
  "slate.get_agent_status",

  // Telemetry
  "slate.get_logs",
  "slate.get_history",
  "slate.history_status",
  "slate.rotate_history"
];
