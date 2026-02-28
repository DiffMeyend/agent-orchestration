# MindOS Architecture Decisions – v0

## Execution Model
- Agents are run manually via Codex/ChatGPT for now; Slate routes but does not execute.
- `slate.route_task` provides task envelopes; the runner invokes the referenced agent manifest.
- Automation tooling (MCP, Nx, etc.) is being wired incrementally; v0 emphasizes clarity over autonomy.

## Agents
- Personas are deprecated; the canonical runtime roles are functional agents.
- Active agent roles:
  - **Alchemist** – ideation / charge / option finding (manifest pending).
  - **Resonant** – context analysis, alignment, ticket triage (manifest + runner in progress).
  - **Architect** – planning, specs, scaffolding (manifest pending).
  - **Executor** – implementation, execution, testing (runner exists).
  - **Horizon** – review, reflection, integration (runner exists).
- Each agent has a manifest (`tools/agents/*.yaml`) plus optional behavioral_engine docs.

## Protocol & Artifacts
- Canonical machine protocol = `context/protocol/context_pipeline.yaml` + `context/schemas/context_packet.schema.json`.
- `context_packet` (JSON) is the structured artifact; `brief` (Markdown) is the human-facing summary.
- Legacy “FRAME” terms or persona labels must not appear in active assets.

## Schema & Storage
- `context/schemas/context_packet.schema.json` defines the packet; `agent_id` is required, `phase` recommended.
- Artifacts live under `context/context_packets/` and `context/briefs/` as the working set.
- History/long-term storage will move to `history/` in a later phase.

## Nx Role
- Nx remains the orchestrator/package manager for projects; future phases will deepen Nx integration.
- Do not remove Nx scaffolding—codify new tasks/targets there as the system matures.

## Human Phases
- Human phases map directly to agents in the state contract:
  - Discover → Alchemist
  - Decide   → Resonant
  - Design   → Architect
  - Build    → Executor
  - Review   → Horizon
- Slate uses this mapping (via the pipeline) to recommend agents per task.

## Status Notes
- `research_agent` is the only fully wired agent (manifest + behavioral engine + routing).
- Other agents exist as stubs; wiring will proceed iteratively.
- `_archive/` holds legacy persona docs and TextBlaze Context Engine assets; they are reference-only.

## History & Rotation
- `context/context_packets/` and `context/briefs/` store active/current artifacts.
- `history/` holds long-term records under `history/YYYY/MM/<workflow>/`.
- Run `scripts/rotate_context_to_history.ps1` to migrate artifacts older than the retention window (manual utility for now).
- Future phases will automate pruning/compression of very old history entries.

## Nx Projects & Guards
- Nx owns orchestration for `context/`, `tools/agents`, `apps/mcp-runtime/slate-runtime`, and `scripts/`.
- `scripts/validate_context_packet_schema.mjs` underpins the `context:validate:schema` target.
- Agent hygiene targets will be reintroduced once Nx automation resumes; for now follow `/Scratch.md` guidance manually.
- Slate runtime and scripts projects currently expose placeholder build/lint targets; flesh them out as tooling matures.
