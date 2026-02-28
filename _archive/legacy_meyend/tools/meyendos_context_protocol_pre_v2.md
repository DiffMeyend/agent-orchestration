# MindOS Context Protocol

## 1. Purpose
The Context Protocol is the contract that decides when GPT outputs, Slate telemetry, and human handoffs become “Os‑grade”—structured enough to enter MindOS arcs, snippets, and operators. It filters raw chat or intuition into labeled packets that respect neurodivergent constraints (explicit personas, state, sensory load, autonomy level) so Slate can run safely inside deep focus or burnout scenarios without re‑interpreting intent on the fly.

It sits between upstream ideation (Vibe Studio, raw notes) and downstream execution (CE/Plan, Branch/Vet/Test, Ship). Before a packet crosses from Vibe→Research or Research→CE, it must satisfy this protocol: identify the lifecycle phase, capture persona/state/Quiet‑Verbose switch (the `mode` field), and expose assumptions, references, and desired outputs. That gives Slate and human operators a common language for “what is this context and what should happen next.”

The protocol supports neurodivergent‑friendly structure by forcing brevity + clarity (short headings, required fields) and by anchoring autonomy (L0–L3) so Slate never infers more authority than the packet grants. It lets GPTs hand off precise intents while still honoring regulation patterns (Quiet vs Verbose, faded_focus vs Deep Focus) defined in MindOS arcs.

## 2. Scope
**Phases covered:** every handoff from Vibe, Research, CE/Plan, Branch/Vet/Test through Ship. Each phase must emit a packet when moving downstream or when Slate logs a decision that will influence future work.

**In scope**
- GPT outputs from Vibe Studio, Research Analyst, Architect/Planner models.
- Human-authored context packets (e.g., CE plan templates, Operator checklists).
- Slate-originated telemetry that feeds back into planning/history (state changes, autonomy decisions, vet/test annotations).

**Out of scope**
- Raw chat logs, unstructured vibe dumps that haven’t been CE’d.
- Arbitrary external docs dropped into the repo without personas/state/autonomy metadata.
- Ad-hoc DMs/notes unless they’re transformed into a context packet.

**Tools governed**
- Vibe Studio GPT, Research Analyst GPT, Architect GPT (any GPT that claims to feed MindOS).
- Slate runtime (state + Quiet/Verbose switch via the `mode` field, telemetry).
- Human operators when submitting context into MindOS (CE/Plan drafts, Vet notes). Anything outside these (e.g., external AI with no contract) is considered untrusted until re-shaped via the protocol.

## 3. Context Packet Schema (GPT → MindOS)
[Every context packet must carry the fields below before entering MindOS. Markdown tables or YAML blocks are acceptable, but the keys must be present and clearly labeled.]

- `origin`: who generated the packet (e.g., “Vibe Studio GPT”, “Research Analyst GPT”, “Human CE Operator”, “Slate Telemetry”).
- `phase`: lifecycle phase (Vibe, Research, CE/Plan, Branch/Vet/Test, Ship).
- `persona`: operating persona (Alchemist, Resonant, Architect, Executor, Horizon).
- `state` / `mode`: current runtime state (deep_focus, faded_focus, simple_task, complex_task) and the Quiet/Verbose switch (the field name `mode` is retained because Slate’s API expects it).
- `problem_statement`: 1–3 sentences defining the question or task.
- `assumptions`: bullet list of what the packet assumes (data availability, environment, prior approvals).
- `constraints`: bullet list of boundaries (scope limits, sensory constraints, regulatory rules).
- `requirements/goals`: explicit outputs or success criteria.
- `inputs`: references to research, prior notes, files, snippets.
- `recommendations/proposals`: optional—guidance for the next persona/phase.
- `handoff_targets`: explicit next destinations (Architect, Slate runtime, Human review, etc.).

These fields can be written as a Markdown checklist/table or as YAML. Keep each section short (a few bullets) to stay neurodivergent-friendly and easy for Slate to parse.

### 3.1 YAML Schema Example
```yaml
origin: "Research Analyst GPT"
phase: "Research"
persona: "Resonant"
state: "n/a"
mode: "n/a"
problem_statement: "Summarize best practices for Slate autonomy levels."
assumptions:
  - "Slate runs as a local Slate MCP Runtime with token auth."
constraints:
  - "Must be safe for work environments."
requirements:
  - "List at least 3 autonomy patterns."
inputs:
  - "https://internal.docs/autonomy_patterns"
recommendations:
  - "Hand off to Architect for CE/Plan."
handoff_targets:
  - "Architect"
```

### 3.2 Markdown Packet Template
```
**Origin:** (e.g., Vibe Studio GPT, Human CE Operator)
**Phase:** (Vibe | Research | CE/Plan | Vet/Test | Ship)
**Persona:** (Alchemist | Resonant | Architect | Executor | Horizon)
**State / Quiet-Verbose Switch:** (state: deep_focus/faded_focus/... ; switch: quiet/verbose/...)

#### Problem Statement
- ...

#### Assumptions
- ...

#### Constraints
- ...

#### Requirements / Goals
- ...

#### Inputs / References
- ...

#### Recommendations / Proposals
- ...

#### Handoff Targets
- ...
```

## 4. Phase-Specific Contracts
### 4.1 Vibe → Research
- **Minimum fields:** origin, phase=Vibe, persona, state + Quiet/Verbose switch, problem_statement, constraints, assumptions, handoff_targets (Research).
- **Recommended fields:** any early recommendations or hypotheses, and explicit “open questions for Research.”
- **Ready to hand off:** the vibe has a clear problem or intent, constraint boundaries (sensory load, scope), and doesn’t assume correctness—Research is asked to validate/expand.
- **Not allowed:** untagged vibes (“I feel like…”) without a problem_statement or constraints; claims presented as facts.
- **Example:**  
  ```yaml
  phase: "Vibe"
  problem_statement: "Could Slate detect when autonomy levels drift?"
  constraints:
    - "No auto-switching yet."
  handoff_targets: ["Research"]
  ```

### 4.2 Research → CE/Plan
- **Minimum fields:** origin (Research GPT/human), phase=Research, persona/state/Quiet-Verbose switch, problem_statement, assumptions, constraints, requirements/goals, inputs (sources), recommendations, handoff_targets (Architect/CE).
- **Ready to hand off:** every factual claim references an input (URL, doc, note), CE knows what to build/test, and the packet states whether gaps remain.
- **Not allowed:** missing sources, “see chat above” references, or goals that don’t map to operators/snippets.
- **Example:**  
  ```yaml
  phase: "Research"
  inputs:
    - "research/docs/autonomy_patterns.md"
  requirements:
    - "Architect needs a CE plan for L0-L3 prompts."
  handoff_targets: ["Architect"]
  ```

### 4.3 CE/Plan → Branch/Dev
- **Minimum fields:** origin (Architect/Planner), phase=CE/Plan, persona/state/Quiet-Verbose switch, problem_statement, requirements/goals, constraints, inputs (linked operators/files), recommendations/proposals that map to repo locations, handoff_targets (Branch/Dev, Slate).
- **Ready to hand off:** CE plan ties requirements to specific files/snippets/operators (e.g., “edit tools/snippets/MindOS-Workflows-Planning.json, snippet X”), names loops to run, and sets autonomy/Slate hints.
- **Not allowed:** vague “fix this” requirements, missing file references, or plans that don’t specify which operator (Branch/Dev) should run.
- **Example:**  
  - Requirements: “Add `Slate: Rotate History` command (extension/src/extension.ts).”
  - Handoff target: “Branch/Dev – implement + test.”

### 4.4 Vet/Test → History/Reflection
- **Minimum fields:** origin (Slate or Human Vet/Test), phase=Vet/Test, persona/state/Quiet-Verbose switch, problem_statement (what was validated), constraints (test boundaries), requirements/goals (what was expected), inputs (links to logs/tests), outcomes/recommendations, handoff_targets (“History”, “Reflection”).
- **Ready to hand off:** packet names the operator/test run, captures outcomes (pass/fail, deviations), states autonomy and Quiet/Verbose switch used, and pushes to history for future loops.
- **Not allowed:** unlogged results, missing deviations, or “worked fine” with no evidence.
- **Example:**  
  ```yaml
  phase: "Vet/Test"
  inputs:
    - "history/slate_rotation.log"
  recommendations:
    - "Log warning when rotate_history fails; hand off to History."
  handoff_targets: ["History", "Reflection"]
  ```

## 5. Persona & State Integration
Every packet declares persona, state, and the Quiet/Verbose switch (stored in the `mode` field) so the next operator (human or Slate) knows how to interpret tone/details.

- **Alchemist** (Vibe, ideation, regulation) – high-level possibilities, sensory cues, no code. Packet tone should be exploratory; include constraints that protect nervous system load. Usually flows into Research/Resonant.
- **Resonant** (Research, analysis) – evidence-heavy, structured briefs. Packets should cite sources, list assumptions, and prepare questions for CE.
- **Architect** (CE/Plan) – detailed plans, operators, file-level instructions. Tone should be precise, mapping loops to repo paths/snippets.
- **Executor** (Branch/Dev, Slate) – implementation commands/tests. Packets must be actionable (which files, which commands).
- **Horizon** (Reflection/Integration) – summarizing history, future direction. Packets should capture outcomes, lessons, next experiments.

**State guidance**
- `deep_focus`: Slate/humans can handle detailed tasks; packet may permit higher autonomy (L2–L3).
- `faded_focus`: packet should bias toward smaller next steps, simplified instructions, and lower autonomy (L0–L1); include sensory constraints.
- `simple_task` / `complex_task`: signal whether the packet expects small change or cross-arc coordination.

**Quiet/Verbose switch guidance**
- `quiet`: minimal chatter; just the essentials for execution/logging.
- `verbose`: allow narrative and context; useful for sense-making stages.

Packets should explicitly state persona/state/Quiet-Verbose switch so Slate or a human can adjust voice/autonomy before executing.

## 6. Slate Integration
- `state` + `phase` → drives `slate.set_state` (e.g., packet says `state: deep_focus`, Slate sets runtime to deep_focus before running).
- `mode` → mapped to the Quiet/Verbose switch via `slate.set_mode` (future switches should expose their own setters).
- `persona` and packet requirements → inform `slate.decide_autonomy` (Architect persona with detailed CE plan likely maps to L2; faded_focus state may clamp to L0–L1).
- `inputs/requirements` → Slate uses them to choose operators/snippets and logs them via history/telemetry.

**Example (CE/Plan handoff to Slate)**
```yaml
origin: "Architect GPT"
phase: "CE/Plan"
persona: "Architect"
state: "deep_focus"
mode: "quiet"
requirements:
  - "Add Slate: Rotate History command in extension/src/extension.ts"
  - "Map command to slate.rotate_history RPC"
handoff_targets:
  - "Slate"
```
Slate behavior:
1. `slate.set_state("#state:deep_focus")` and `slate.set_mode('quiet')`.
2. `slate.decide_autonomy` (deep_focus + CE task → L2 with checkpoints).
3. Execute plan (edit file, add command) within autonomy bounds, log `state_change` / `autonomy_decision` events.

Slate operates as the **Executor persona**: it does not emit new vibes or research briefs. It executes instructions, updates history, and reports telemetry back into the protocol.

## 7. Examples
- Placeholder: Vibe example packet summary.
- Placeholder: Research example packet summary.
- Placeholder: CE/Plan example packet summary.

## 8. Implementation Notes
- Placeholder: how this protocol feeds GPT instructions, MindOS operators, and Slate workflows.
- Placeholder: outline rollout steps/todos.
