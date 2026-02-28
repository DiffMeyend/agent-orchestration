# MindOS Agent Backlog _(Superseded)_

> **Superseded by:** `/Scratch.md`
>
> This backlog captures historical planning. For the live agent backlog, see `/Scratch.md`.

## 0. Status

- Architecture: agent-based (Alchemist, Resonant, Architect, Executor, Horizon). Legacy persona docs live under `_archive/`.
- Execution: manual Codex/ChatGPT runner; Slate routes tasks (via `slate.route_task`); Nx orchestrates context/agents/slate-runtime/scripts.
- Scope: personal DevOps/indie automation OS; v0 prioritizes research_agent, schema validation, and manual runners.

## 1. v0 – Stability & Trust

- [ ] Ensure `context/context_packets/` always contains at least one up-to-date example per workflow; add more real packets and run `nx run context:validate:schema` before committing.
- [ ] Keep `docs/agents/research_agent_runner.md` in sync with `tools/agents/resonant.yaml` whenever behavior changes.
- [ ] Add a README snippet instructing devs to run `nx run context:validate:schema && nx run agents:lint` before editing agent manifests or schema.
- [ ] Document a standard naming convention for context_packet/brief filenames (slug strategy) and enforce it via a lint rule or script.
- [ ] Harden `scripts/rotate_context_to_history.ps1`: infer workflow from filename (instead of defaulting to `ticket_triage`), add dry-run output, and log moves.

## 2. v1 – Agent Behavior & Flows

- [ ] Flesh out the Alchemist manifest/behavioral spec with concrete prompts, option templates, and routing heuristics.
- [ ] Define the Architect spec format for plan/spec handoffs; update Slate routing once spec behavior exists.
- [ ] Create the Executor manifest with preflight safety checks (approved commands, diff templates) and draft a manual runner template similar to Resonant.
- [ ] Outline Horizon outputs (retros, release notes) and integrate with history logging so it can summarize recent packets.
- [ ] Add tests/examples for cross-agent handoffs (context_packet + brief chains) and document them in `docs/agents/handbook.md`.

## 3. v2 – Slate & MCP Integration

- [ ] Implement a real MCP transport for Slate runtime (`apps/mcp-runtime/slate-runtime`) so routed packets can be sent to Codex/ChatGPT runners programmatically.
- [ ] Add a `slate.route_task` path for design/build/review agents once their manifests are ready (including input envelopes).
- [ ] Capture runner history (context_packet + brief paths) in Slate logs so future automation can replay decisions.
- [ ] Introduce a CLI wrapper (`scripts/run_agent_task.mjs`) that reads Slate’s packet envelope and opens a Codex/ChatGPT session with the correct prompt template.

## 4. v2+ – Indie Platform & Experiments

- [ ] Prototype indie workflow automations (e.g., newsletter prep, consulting reports) using the agent model and document them as new runners.
- [ ] Explore multi-agent sessions (creative → research → design) with automated state capture; identify the minimal telemetry needed for future multi-user scenarios.
- [ ] Experiment with Nx generators to scaffold new agent manifests/behavioral engines from templates.

## 5. Legacy / To Re-evaluate

- [ ] Review `docs/todo.meyend.md` items and migrate anything still relevant into this backlog; mark the rest as historical.
- [ ] Validate that `_archive/personas/` is no longer referenced by active code/tests (run `nx run agents:guard:archive`).
- [ ] Decide whether to migrate remaining TextBlaze snippets into VS Code/MCP snippets or retire them entirely.
