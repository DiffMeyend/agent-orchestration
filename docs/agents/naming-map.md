# Agent Naming Map

> Updated February 2026. Use this table to correlate Slate manifests, behavioral engines, and TypeScript runners.

| Manifest File | Agent ID | Role                     | Runner / Package  | Status     |
|---------------|----------|--------------------------|-------------------|------------|
| `tools/agents/slate.yaml` | `slate`    | Orchestrator              | _No runner_        | Active     |
| `tools/agents/polymath.yaml` | `polymath` | Divergent Exploration     | `/agents/polymath` | Active     |
| `tools/agents/resonant.yaml` | `resonant` | Research / Context Agent  | `/agents/resonant` | Active     |
| `tools/agents/architect.yaml` | `architect` | Design & Specification    | `/agents/architect` | Active     |
| `tools/agents/alchemist.yaml` | `alchemist` | Options & Ideation        | `/agents/alchemist` | Active     |
| `tools/agents/executor.yaml` | `executor` | Build & Implementation    | `/agents/executor` | Active     |
| `tools/agents/horizon.yaml` | `horizon`  | Review & Ship Decision    | `/agents/horizon`  | Active     |

Legacy manifests (build/creative/design/review variants) now live in `/_archive/legacy_agents/` for reference only. Always author new automation against the active manifests listed above.

Legacy manifests (Build, Creative, Design, Review variants) now live in `/_archive/legacy_agents/` for reference only. Always author new automation against the active manifests listed above.
