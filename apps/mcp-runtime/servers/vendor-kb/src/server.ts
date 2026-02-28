import { listToolSchemas, toolHandlers } from "./tools/index.js";
import { listResources, readResource } from "./resources/index.js";
import type { JsonRpcRequest, JsonRpcResponse } from "./types.js";

function makeResult(id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result
  };
}

function makeError(id: JsonRpcRequest["id"], code: number, message: string, data?: any): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      data
    }
  };
}

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  try {
    switch (req.method) {
      case "kb.list_tools":
        return makeResult(req.id, { tools: listToolSchemas() });
      case "kb.search":
      case "kb.get": {
        const handler = toolHandlers[req.method];
        if (!handler) {
          return makeError(req.id, 404, `Unknown tool: ${req.method}`);
        }
        const result = await handler(req);
        return makeResult(req.id, result);
      }
      case "kb.list_resources":
        return makeResult(req.id, { resources: listResources() });
      case "kb.fetch_resource": {
        const uri = req.params?.uri;
        if (typeof uri !== "string" || uri.length === 0) {
          return makeError(req.id, 400, "Missing resource uri");
        }
        const resource = readResource(uri);
        if (!resource) {
          return makeError(req.id, 404, `Resource not found: ${uri}`);
        }
        return makeResult(req.id, resource);
      }
      default:
        return makeError(req.id, 404, `Unknown method: ${req.method}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return makeError(req.id, 500, "vendor-kb server error", { error: message });
  }
}

function startServer() {
  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", async (chunk: string) => {
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;

      let req: JsonRpcRequest;
      try {
        req = JSON.parse(line);
      } catch (error) {
        const resp = makeError(undefined, -32700, "Parse error", { error: error instanceof Error ? error.message : String(error) });
        process.stdout.write(JSON.stringify(resp) + "\n");
        continue;
      }

      const response = await handleRequest(req);
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  });

  process.stdin.on("end", () => {
    process.exit(0);
  });
}

startServer();
