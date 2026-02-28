# External AI Runner Integration

Guide for integrating external AI systems (Codex, ChatGPT, Claude) with SLATE via MCP.

## Overview

SLATE provides two transport mechanisms for MCP communication:

1. **stdio** (default) - Process-based communication via stdin/stdout
2. **HTTP** - Network-based API for remote AI runners

## HTTP Transport

### Starting the HTTP Server

```bash
# Default (localhost:3100)
node apps/mcp-runtime/slate-runtime/dist/http-server.js

# Custom port and host
SLATE_HTTP_PORT=8080 SLATE_HTTP_HOST=0.0.0.0 node apps/mcp-runtime/slate-runtime/dist/http-server.js

# With authentication
SLATE_RPC_TOKEN=your-secret-token node apps/mcp-runtime/slate-runtime/dist/http-server.js
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SLATE_HTTP_PORT` | 3100 | HTTP server port |
| `SLATE_HTTP_HOST` | 127.0.0.1 | Host to bind to |
| `SLATE_RPC_TOKEN` | (none) | Optional authentication token |
| `SLATE_CORS_ORIGINS` | * | Comma-separated allowed origins |

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/rpc` | POST | JSON-RPC 2.0 endpoint |
| `/health` | GET | Health check |
| `/methods` | GET | List available methods |

## Agent Execution

### Running an Agent

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "slate.run_agent",
  "params": {
    "agent_id": "polymath",
    "session_id": "session-2026-02-09-abc123",
    "autonomy_level": "L2",
    "input": {
      "goal": "Implement user authentication",
      "context": {}
    },
    "timeout": 60000
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "executionId": "exec-2026-02-09-xyz789",
    "agentId": "polymath",
    "sessionId": "session-2026-02-09-abc123",
    "status": "running",
    "startedAt": "2026-02-09T12:00:00Z"
  }
}
```

### Checking Execution Status

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "slate.get_agent_status",
  "params": {
    "execution_id": "exec-2026-02-09-xyz789"
  }
}
```

### Available Agents

| Agent ID | Produces | Description |
|----------|----------|-------------|
| `polymath` | TaskMap | Exploration and task decomposition |
| `resonant` | EvidencePack | Evidence gathering and validation |
| `architect` | DesignSpec | Design and specification |
| `executor` | PatchSet | Code implementation |
| `horizon` | ShipDecision | Verification and gating |
| `alchemist` | OptionsSet | Creative reframing |

## Session Workflow

### 1. Create a Session

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "slate.create_session",
  "params": {
    "goal": "Implement feature X",
    "context": { "questions": {}, "decision_matrix": {} },
    "autonomy_level": "L2"
  }
}
```

### 2. Run Pipeline Agents

```bash
# Run Polymath
curl -X POST http://localhost:3100/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "slate.run_agent",
    "params": {
      "agent_id": "polymath",
      "session_id": "session-...",
      "autonomy_level": "L2",
      "input": {}
    }
  }'

# Poll for completion
curl -X POST http://localhost:3100/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "slate.get_agent_status",
    "params": { "execution_id": "exec-..." }
  }'
```

### 3. Advance Session

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "slate.advance_session",
  "params": {
    "session_id": "session-...",
    "step": "architect"
  }
}
```

## Authentication

When `SLATE_RPC_TOKEN` is set, include the token in requests:

```bash
curl -X POST http://localhost:3100/rpc \
  -H "Content-Type: application/json" \
  -H "X-RPC-Token: your-secret-token" \
  -d '{"jsonrpc":"2.0","id":1,"method":"slate.get_state"}'
```

Or use Bearer authentication:

```bash
curl -X POST http://localhost:3100/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token" \
  -d '{"jsonrpc":"2.0","id":1,"method":"slate.get_state"}'
```

## Codex Integration Example

```python
import requests

SLATE_URL = "http://localhost:3100/rpc"
SLATE_TOKEN = "your-token"

def call_slate(method, params=None):
    response = requests.post(
        SLATE_URL,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {}
        },
        headers={"X-RPC-Token": SLATE_TOKEN}
    )
    return response.json()

# Create session
session = call_slate("slate.create_session", {
    "goal": "Build feature",
    "context": {},
    "autonomy_level": "L2"
})

# Run agent
execution = call_slate("slate.run_agent", {
    "agent_id": "polymath",
    "session_id": session["result"]["id"],
    "autonomy_level": "L2",
    "input": {}
})

print(f"Execution started: {execution['result']['executionId']}")
```

## ChatGPT Plugin Integration

For ChatGPT plugin integration, expose the HTTP server with CORS enabled:

```bash
SLATE_HTTP_HOST=0.0.0.0 \
SLATE_CORS_ORIGINS=https://chat.openai.com \
SLATE_RPC_TOKEN=secure-token \
node apps/mcp-runtime/slate-runtime/dist/http-server.js
```

Then configure the plugin manifest to use the `/rpc` endpoint.

## Error Handling

All errors follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": 400,
    "message": "Invalid agent_id: unknown"
  }
}
```

Common error codes:
- `400` - Invalid request parameters
- `401` - Unauthorized (invalid token)
- `404` - Resource not found
- `500` - Internal server error

## Graceful Degradation

If an agent fails during pipeline execution, SLATE can continue with reduced context:

- **Resonant failure**: Creates fallback EvidencePack with warnings
- Architect, Executor, Horizon continue with degraded data
- Final ShipDecision includes degradation warnings

See [error-handling.md](error-handling.md) for details.
