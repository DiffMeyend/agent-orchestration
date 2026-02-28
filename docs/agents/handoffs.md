# Agent Handoffs

MindOS agents work in a relay: each stage produces artifacts that the next stage consumes. This guide documents the expected handoff contract so new contributors can follow the same playbook.

## Core Principles

1. **Artifacts are the API.** Every agent emits typed artifacts (TaskMap, EvidencePack, DesignSpec, PatchSet, ShipDecision, etc.). Never pass ad-hoc notes—commit to the schema.
2. **State stays in context.** Runtime state (operator state, CSS score, autonomy level) is tracked by Slate/MIND. Agents refer to state tags instead of keeping private copies.
3. **Chain of custody.** Each artifact references its parent (e.g., DesignSpec links to EvidencePack). Preserve this lineage so Horizon and history tools can audit decisions.

## Typical Handoff Flow

| From → To | Artifact(s) | Notes |
|-----------|-------------|-------|
| Polymath → Resonant | `TaskMap` | Resonant validates assumptions/unknowns and cites TaskMap ID in the resulting EvidencePack. |
| Resonant → Architect | `EvidencePack` | Architect builds a DesignSpec referencing the EvidencePack ID and carries forward constraints/risks. |
| Architect → Executor | `DesignSpec` | Executor links every PatchSet back to the DesignSpec (`design_spec_ref`) and copies acceptance criteria into `how_to_verify`. |
| Executor → Horizon | `PatchSet`, `DesignSpec` | Horizon evaluates ship gates, anti-patterns, and produces `ShipDecision` + `ReleaseNotes`. |
| Horizon → History / Ops | `ShipDecision`, `ReleaseNotes`, `PatchSet` | History tooling registers artifacts via `slate.register_artifact` so other agents can query the chain. |

## State Preservation

1. **Context Packets:** Store canonical Ten Questions + decision matrix; this gives every agent common ground. When generating new artifacts, cite the context packet ID if it influenced your work.
2. **Autonomy Level:** Handoffs should note the autonomy level (L0–L3) under which the artifact was produced. If the next agent needs a higher level, call `slate.decide_autonomy` again rather than assuming.
3. **Worktrees:** Executor/Horizon share a worktree ID so Horizon can run verification commands. Include `worktree_id` in logs and artifacts for traceability.

## Error Recovery

| Scenario | Detection | Action |
|----------|-----------|--------|
| Upstream artifact invalid | Schema validation fails | Reject the artifact, log via `AgentError`, and request regeneration with specific fixes. |
| Missing parent link | Artifact lacks `_ref` fields | Stop the pipeline; register a blocker ticket so upstream agents re-run with correct references. |
| Worktree gone | Horizon cannot read worktree | Call `slate.get_worktree` and, if missing, send Executor a `handoff_failed` brief including the worktree ID and reason. |
| Context drift | New facts contradict context packet | Resonant runs again to refresh `context/context_packets/` and notifies Architect/Executor of the new packet ID. |

## Practical Tips

- Include handoff notes in the brief (“Next: Architect. Focus on interface X, accept risk Y.”).
- When a handoff fails repeatedly, open `docs/agents/handoffs.md` and document the edge case. Treat this file as the living runbook for cross-agent coordination.
- Never move files silently. Use rotation scripts (`scripts/rotate_context_to_history.ps1`) so history/ lineage scripts know where to look.
