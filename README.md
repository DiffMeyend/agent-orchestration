# agent-orchestration

Multi-agent orchestration runtime with operator-aware autonomy. Six specialized agents collaborate through a typed artifact pipeline, with autonomy levels dynamically adjusted based on operator cognitive state.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     MCP Runtime (41 RPC methods)             │
│  Sessions · Artifacts · Worktrees · Agent Execution · Merge  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│                   Orchestration Pipeline                      │
│  POLYMATH → RESONANT → ARCHITECT → EXECUTOR → HORIZON        │
│            (optional)                                         │
└────────┬─────────────────────────────────┬───────────────────┘
         │                                 │
┌────────┴────────┐               ┌────────┴────────┐
│   MIND Engine   │               │  BASIS Engine    │
│  Operator State │               │  Context Score   │
│  Machine (FSM)  │               │  Calculator      │
│                 │               │                  │
│ fresh → mid →   │               │ Domains ×        │
│ faded ↔ high_   │               │ Weights →        │
│ pressure        │               │ Caps/Penalties → │
│                 │               │ CSS (0-100)      │
│ → Autonomy      │               │ → Tier A/B/C     │
│   L0-L3         │               │                  │
└─────────────────┘               └──────────────────┘
```

## How It Works

1. **Task enters** the pipeline via the MCP runtime
2. **MIND engine** evaluates operator state (session duration, decision count, error rate, fatigue signals) and assigns an autonomy level (L0–L3)
3. **BASIS engine** calculates a Context Sufficiency Score across weighted domains — determines whether enough context exists to proceed
4. **Agents execute** in sequence, each producing a typed artifact:

| Agent | Role | Artifact |
|-------|------|----------|
| **Polymath** | Divergent exploration, hypothesis generation | TaskMap |
| **Resonant** | Evidence validation, risk assessment | EvidencePack |
| **Architect** | Design specification from evidence | DesignSpec |
| **Executor** | Implementation in isolated worktrees | PatchSet |
| **Horizon** | Ship gating (5 gates), release decision | ShipDecision |
| **Alchemist** | Creative reframing when work is stuck | OptionsSet |

5. **Permission matrix** enforces read/write guardrails per agent per autonomy level. Only Executor can write code, and only at L2+.

## Project Structure

```
slate/
├── agents/              # 6 agent runners (polymath, resonant, architect, executor, horizon, alchemist)
├── engines/
│   ├── basis/           # Context Sufficiency Score calculator
│   └── mind/            # Operator state machine + autonomy resolver
├── libs/
│   ├── context-schema/  # Zod artifact schemas (TaskMap, EvidencePack, DesignSpec, etc.)
│   ├── context-loader/  # Markdown + YAML context loading
│   ├── orchestration/   # Pipeline coordination + session management
│   └── llm-provider/    # LLM router (OpenAI primary, Anthropic fallback)
├── apps/
│   └── mcp-runtime/     # JSON-RPC server (41 methods)
├── tests/               # E2E test suites
└── tools/               # Agent manifests, contracts, templates
```

## Tech Stack

- **Language:** TypeScript 5.4
- **Build:** Nx monorepo
- **Schema Validation:** Zod
- **Testing:** Vitest
- **LLM Integration:** OpenAI SDK, Anthropic SDK
- **Runtime:** Node.js, vite-node
- **Protocol:** MCP (Model Context Protocol) via JSON-RPC

## Run

```bash
# Install dependencies
npm install

# Build all packages
npx nx run-many --target=build

# Run tests
npx nx run-many --target=test

# Start MCP runtime
npx nx run slate-runtime:serve
```

## Status

Working prototype, actively developed. Core pipeline, all 6 agents, both engines, and the MCP runtime are functional with passing test suites. Not production-hardened — session persistence is file-based, no monitoring/observability layer yet.
