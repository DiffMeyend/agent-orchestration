# Slate MCP Runtime

JSON-RPC server powering SLATE's Model Context Protocol interface.

## Getting Started

```bash
npm install        # at repo root

# Start stdio server (default)
nx run slate-runtime:serve

# Start HTTP server (for external AI runners)
nx run slate-runtime:serve:http

# Or with environment config
SLATE_HTTP_PORT=3100 nx run slate-runtime:serve:http
```

## Transport Options

| Transport | Command | Use Case |
|-----------|---------|----------|
| stdio | `nx run slate-runtime:serve` | Local process communication |
| HTTP | `nx run slate-runtime:serve:http` | External AI runners (Codex, ChatGPT) |

See [docs/external-ai-runners.md](/docs/external-ai-runners.md) for HTTP integration guide.

## MCP Methods

### State Management

| Method | Description |
|--------|-------------|
| `slate.set_state` | Set runtime state (fresh, mid, faded, high_pressure) |
| `slate.get_state` | Get current runtime state |
| `slate.set_mode` | Set operating mode (quiet, verbose) |
| `slate.get_mode` | Get current operating mode |
| `slate.decide_autonomy` | Maps state × task type → autonomy level (L0-L3) |

### Context & CSS

| Method | Description |
|--------|-------------|
| `slate.calculate_css` | Calculate Context Stability Score from payload |
| `slate.get_snippet` | Retrieve a snippet by ID |
| `slate.list_snippets` | List all available snippets |
| `slate.route_task` | Route a task to the appropriate agent |

### Worktree Management

| Method | Description |
|--------|-------------|
| `slate.create_worktree` | Create isolated git worktree for Executor |
| `slate.get_worktree` | Get worktree info by ID |
| `slate.list_worktrees` | List all worktrees |
| `slate.cleanup_worktree` | Remove worktree after use |
| `slate.gate_merge` | Approve merge (requires ShipDecision) |

### Artifact Storage

| Method | Description |
|--------|-------------|
| `slate.register_artifact` | Store agent output (TaskMap, PatchSet, etc.) |
| `slate.query_artifacts` | Query artifacts by type, agent, or session |
| `slate.get_artifact` | Get single artifact by ID |
| `slate.get_artifact_chain` | Get artifact lineage chain |

### Session Management

| Method | Description |
|--------|-------------|
| `slate.create_session` | Create orchestration session |
| `slate.get_session` | Get session info and artifacts |
| `slate.list_sessions` | List all sessions |
| `slate.start_session` | Begin pipeline execution |
| `slate.advance_session` | Move to next pipeline step |
| `slate.complete_session` | Mark session complete |
| `slate.fail_session` | Mark session failed with error |
| `slate.get_session_artifact` | Get artifact from session |
| `slate.get_session_lineage` | Get artifact lineage in session |

### Permissions

| Method | Description |
|--------|-------------|
| `slate.enforce_perms` | Check if permission is allowed |

### Agent Execution

| Method | Description |
|--------|-------------|
| `slate.run_agent` | Execute an agent with given input |
| `slate.get_agent_status` | Check execution status by ID |
| `slate.list_agent_executions` | List all executions for a session |

### Telemetry

| Method | Description |
|--------|-------------|
| `slate.get_logs` | Get recent runtime logs |
| `slate.get_history` | Get event history |
| `slate.history_status` | Get history stats |
| `slate.rotate_history` | Archive old history events |

## Example Usage

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "slate.create_session",
  "params": {
    "goal": "Implement user authentication",
    "context": { "questions": {}, "decision_matrix": {} },
    "autonomy_level": "L2"
  }
}
```

## Architecture

```
apps/mcp-runtime/slate-runtime/
├── src/
│   ├── server.ts          # Main JSON-RPC handler (stdio)
│   ├── http-server.ts     # HTTP server entry point
│   ├── http-transport.ts  # HTTP transport adapter
│   ├── agent-executor.ts  # Agent execution automation
│   ├── artifacts.ts       # Artifact storage
│   ├── worktree.ts        # Git worktree management
│   ├── history.ts         # Event history
│   ├── logs.ts            # Runtime logging
│   ├── runtimeState.ts    # State machine
│   ├── switches.ts        # Mode switches
│   ├── manifest.ts        # Agent manifests
│   └── snippets.ts        # Snippet catalog
└── README.md
```
