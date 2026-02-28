# STATUS: LEGACY – This backlog predates the agent-based architecture. Active work now lives in `/Scratch.md`. Review items below through the agent model before acting.

# MindOS – TODO / Resume Notes

Single place to park “where I left off” so future-me can re-enter the system quickly without reloading the whole context from scratch.

---

## How to use this file

When you pause a session (Codex, Arc editing, runtime design, etc.):

1. Append a new section at the top.
2. Fill in:
   - Date
   - Context (what you were working on)
   - Repo paths touched
   - Last concrete actions
   - Next 1–3 moves only

Keep entries short. This file is for **re-entry**, not journaling.

---

## Template

### [YYYY-MM-DD] – [context tag]

- **Focus area:**  
  (What you were actually doing; 1–2 lines.)

- **Repo paths touched:**  
  - path/one
  - path/two

- **Last actions:**  
  - Action 1  
  - Action 2  

- **Next moves (1–3):**  
  1. …
  2. …
  3. …

- **Notes (optional):**  
  - Any constraints, gotchas, or reminders for future-you.

---

## Example (edit or replace as needed)

### 2025-11-17 – tools.snippets VS Code migration

- **Focus area:**  
  Note to migrate TextBlaze snippet exports under `tools/snippets/` into VS Code snippet files later.

- **Repo paths touched:**  
  - tools/snippets/
  - docs/todo.meyend.md

- **Last actions:**  
  - Confirmed TextBlaze snippet exports remain in place for now.
  - Logged migration intent for future pass.

- **Next moves (1–3):**  
  1. Decide target VS Code snippet file(s)/scope(s) and path convention.
  2. Map `/mOS.*` shortcuts to VS Code snippet prefixes without renaming.
  3. Port one workflow pack as a pilot and verify formatting/escaping.

- **Notes (optional):**  
  - Keep JSON version/structure in TextBlaze exports intact until migration is complete.

---

## Entries

### 2025-11-17 – interaction charter + drift/validation backlog

- **Focus area:**  
  Move interaction TODOs out of AGENTS.md and queue interaction charter + drift/validation work.

- **Repo paths touched:**  
  - AGENTS.md (removed TODO)  
  - docs/todo.meyend.md (captured tasks)

- **Last actions:**  
  - Removed the placeholder TODO from AGENTS.md.  
  - Logged legacy asset review and interaction charter tasks here.

- **Next moves (1–3):**  
  1. Review legacy interaction assets and extract useful pieces into the current charter/snippets: `/Users/jaredlandt/DiffMeyend.local/Dev(needsReview)/Meyend_/OS_Builds/OLDMindOS/contracts/state_contract.md` and `/Users/jaredlandt/DiffMeyend.local/Dev(needsReview)/Meyend_/OS_Builds/OLDMindOS/engine/behavioral_engine.md`.  
  2. Draft `docs/interaction.md` with a lightweight charter (session start flow, context fetch path, logging back to raw.md) and 3 session framers (Fast Plan, Deep Analysis, Stuck/Regulation-first).  
  3. Add `/mOS.session.bind` and `/mOS.operator.log` snippets; wire validation/drift guard (pre-flight command, optional git hook), discovery aid (registry index md + `rg` helper), and plan coverage extensions (new domain arc + regulation-first operator).

- **Notes (optional):**  
  - Gaps: no single interaction charter; validation not automated; discovery friction for arcs/snippets; limited runtime telemetry/feedback loop; domain coverage still sparse.  
  - Risks: drift between snippets/operators/model; personae/switch/reg assets not bundled into repeatable session bindings.  
  - Consider adding a README quicklink to pre-flight validation (`./scripts/validate_context_arcs.py && ./scripts/check_snippets.sh`) and generating a cached `registry/registry.index.md` view.

---

### 2025-11-17 – tools.snippets VS Code migration

- **Focus area:**  
  Note to migrate TextBlaze snippet exports under `tools/snippets/` into VS Code snippet files later.

- **Repo paths touched:**  
  - tools/snippets/
  - docs/todo.meyend.md

- **Last actions:**  
  - Confirmed TextBlaze snippet exports remain in place for now.
  - Logged migration intent for future pass.

- **Next moves (1–3):**  
  1. Decide target VS Code snippet file(s)/scope(s) and path convention.
  2. Map `/mOS.*` shortcuts to VS Code snippet prefixes without renaming.
  3. Port one workflow pack as a pilot and verify formatting/escaping.

- **Notes (optional):**  
  - Keep JSON version/structure in TextBlaze exports intact until migration is complete.

---

### 2025-11-15 – runtime.meyend + domain.work.ascend

- **Focus area:**  
  Wired up MindOS arcs with a JSON Schema validator and added `domain.work.ascend` (Ascend MSP environment) as a first-class arc.

- **Repo paths touched:**  
  - scripts/validate_context_arcs.py  
  - tools/schemas/context_arc.schema.yaml  
  - domain/work/ascend/model.yaml  
  - domain/work/ascend/operator.md  
  - domain/work/ascend/raw.md  

- **Last actions:**  
  - Generalized the validator to be registry-driven (model.yaml paths).  
  - Loosened the schema to match real-world arc structures (actors, motives, constraints, reference_points as rich objects).  
  - Generated first-pass operator + raw narrative for `domain.work.ascend`.  

- **Next moves (1–3):**  
  1. Formalize a relationship/date arc for Anna (values, stressors, connection patterns, sensory/social needs).  
  2. Extract the “Flood Micro-Operator” into a reusable pattern (maybe a shared micro-operator format).  
  3. Design a small set of runtime prompts for common contexts (work flood, band gig, date night, shutdown spiral).

- **Notes:**  
  - System is stable: all arcs currently validate as `[OK]`.  
  - Tonight is date night; runtime work should be in “low impact, high clarity” mode (no big refactors).
