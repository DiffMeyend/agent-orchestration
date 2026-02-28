# Contributing to SLATE

## Quick Start

```bash
npm install        # Install dependencies
nx build           # Build all packages
nx test            # Run all tests
```

## Before Making Changes

Always run validation before editing code:

```bash
# Validate context schemas and lint agents
nx run context-schema:lint && nx run-many --target=lint --projects=polymath,executor,horizon,resonant,architect,alchemist
```

Or use the shorthand:

```bash
npm run validate   # If configured in package.json
```

## Development Workflow

1. **Create a branch** for your changes
2. **Run validation** before editing (commands above)
3. **Make changes** following existing patterns
4. **Run tests** to verify: `nx test`
5. **Run lint** to check style: `nx run-many --target=lint --all`
6. **Submit PR** with clear description

## Project Structure

```
SLATE/
├── agents/           # Agent runners (polymath, executor, horizon, etc.)
├── apps/mcp-runtime/ # MCP servers (slate-runtime, vendor-kb)
├── engines/          # Core engines (basis, mind)
├── libs/             # Shared libraries (context-schema, orchestration)
├── docs/             # Documentation
└── tests/            # E2E tests
```

## Agent Development

See [docs/agents/runner-implementation.md](docs/agents/runner-implementation.md) for:
- How to add LLM calls
- Testing agents with mocked responses
- Debugging agent failures

## Key Concepts

- **Autonomy Levels**: L0 (observe) → L3 (gated auto)
- **CSS**: Context Stability Score (0-100)
- **Pipeline**: Polymath → Resonant → Architect → Executor → Horizon
- **Artifacts**: TaskMap, EvidencePack, DesignSpec, PatchSet, ShipDecision

## Testing

```bash
nx test                           # Run all unit tests
nx run e2e                        # Run integration tests
nx test context-schema            # Test specific package
```

## Documentation

- Main TODO tracking: [Scratch.md](Scratch.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Permission model: [docs/permission-model.md](docs/permission-model.md)
- Error handling: [docs/error-handling.md](docs/error-handling.md)
