> STATUS: ARCHIVED. Canonical machine protocol is now defined by `context/protocol/context_pipeline.yaml` and `context/schemas/context_packet.schema.json`.

# MindOS Context Protocol

> **Purpose**
> The MindOS Context Protocol is the OS-grade contract for passing work between Jared, GPT personas, and Slate.
> It defines **how work-in-progress is described**, **what must be included in a handoff**, and **how the runtime interprets it**.

The Protocol’s job is to turn messy, implicit context into **explicit, structured packets** so that:

* You can safely pause and resume work, even on low-capacity days.
* Different personas (Resonant, Architect, Alchemist, Executor, Horizon) can hand work to each other without confusion.
* Slate can make sensible **autonomy** and **operator selection** decisions.

The Protocol does **not** care about implementation details of any single GPT; it defines the **shared language** they all speak.

---

## 1. Design Goals

1. **Low cognitive load**

   * The field set is small and consistent.
   * Canonical vocabularies (phases, personas, actions, artifacts, switches) are short and reused everywhere.

2. **Durable over time**

   * Names and shapes are intended to stay stable for at least 6–12 months.
   * New fields are added **additively**; existing ones are not lightly renamed.

3. **Handoff-first**

   * Every “chunk” of serious work has:

     * a clear problem statement,
     * explicit assumptions / constraints / requirements,
     * and a named recipient or next step.

4. **Persona- and phase-aware**

   * The **persona** and **phase** are explicit.
   * The **action** and **artifact** are optionally tagged via the `Persona.Action.Artifact` naming scheme.

5. **Switch-aware**

   * Output style and verbosity are controlled via **Switches**, not via hidden prompt tricks.
   * `Quiet` / `Verbose` are **Switches**, not “modes”.

---

## 2. Core Concepts

The Context Protocol standardizes several axes that already exist in MindOS.

### 2.1 Personas

Personas describe **how** the system is thinking about the problem.

Canonical personas:

* **Alchemist** – Charge, vibe, transmutation, turning raw inputs into workable seeds.
* **Resonant** – Research, analysis, pattern-detection, evaluation.
* **Architect** – Planning, constraint-engineering, system design.
* **Executor** – Doing, building, implementing, testing.
* **Horizon** – Reflection, integration, zooming out, direction setting.

Each persona has exactly **two persona-scoped Actions** (see §2.3).
Actions are **not shared across personas**.
Reference: `docs/glossary.md#context-glossary-cheat-sheet` for the contextual terms (actors, frames, anchors, etc.) that Personas and the Context Engine depend on.

### 2.2 Phases

Phases describe **where** in the work loop you are.
They are **coarse stages**, not actions.

**Canonical phase vocabulary (v1):**

1. **Discover**

   * Understand the problem, terrain, and context.
   * Typical activities: ideation, exploratory research, clarifying questions.

2. **Decide**

   * Choose a direction or approach.
   * Typical activities: evaluate options, align with values/neurotype/strengths, select scope.

3. **Design**

   * Turn a chosen direction into a concrete plan/spec.
   * Typical activities: CE planning, breaking into operators, mapping files and flows.

4. **Build**

   * Implement the plan.
   * Typical activities: coding, editing, configuring, running tools.

5. **Review**

   * Check what happened and integrate learning.
   * Typical activities: testing, analysis, reflection, deciding adjustments.

> **Relationship to names**:
> Phases are **not** part of the `Persona.Action.Artifact` string.
> They live in the `phase` field of the packet and act as a coarse stage marker.

### 2.3 Actions

Actions describe **what kind of cognitive move** the persona is making.
They are persona-scoped: each persona has exactly **two** canonical actions.

Examples (names here are illustrative; refer to the persona schema for the actual verbs):

* **Resonant**

  * `Align` – Ensure a plan/idea/approach is aligned with values, neurotype, and strengths.
  * `<OtherAction>` – e.g. deeper research/synthesis action.

> **Important:** `Align` is **Resonant-only.**
> No other persona uses `Align` as an action verb.

Every context packet may optionally specify:

* `action: "<persona-specific-action>"`

### 2.4 Artifacts

Artifacts are the **shape** of the output being produced.

Shared artifact vocabulary (v1):

* **Brief** – Forward-looking orientation doc (problem, why it matters, constraints, success criteria).
* **Proposal** – Forward-looking recommendation doc (options + preferred path) intended for a yes/no/modify decision.
* **Spec** – Commitment-level design doc for execution (what will be built, with acceptance criteria).
* **Code** – Executable implementation (source files, scripts, configs).
* **Report** – Backward-looking explanation (what happened / what was found / what it means).
* **Log** – Chronological record of steps/events (usually raw, low-interpretation).
* **PromptSet** – Cluster of prompts or prompt fragments (system/instructions/patterns to run).
* **Diagram** – Structured visual or text-encoded model (components, flows, state diagrams, etc.).

Every packet may optionally specify:

* `artifact: "<ArtifactName>"`

### 2.5 Persona.Action.Artifact

To make intent explicit, a packet can carry a compact label:

> Grammar + canonical lists live in `docs/conventions.md#personaactionartifact-grammar`. The protocol just consumes the string and keeps it optional but consistent.

```yaml
intent_label: "<Persona>.<Action>.<Artifact>"
```

Examples:

* `Resonant.Align.Report`
* `Architect.Plan.Spec`
* `Executor.<BuildAction>.Code`
* `Horizon.<ReflectAction>.Report`

This string is **advisory** metadata for humans and Slate.
The Protocol does not enforce which combinations are legal, but future tooling may validate them.

### 2.6 State

`state` captures the **runtime mental/regulation state** and/or task complexity – things like:

* `deep_focus`
* `faded_focus`
* `simple_task`
* `complex_task`
* (You can extend this set as needed.)

Slate can use `state` to:

* modulate autonomy (lower for faded_focus, higher for simple_task, etc.),
* adjust how aggressively to simplify or chunk work.

### 2.7 Switches

Switches are **global toggles** that control output **style, verbosity, and formatting**.

Canonical switches include:

* `Quiet` – Minimal narration, fewer side comments.
* `Verbose` – More explanation, teaching, commentary.
* `Format:Markdown` – Prefer Markdown formatting.
* `Format:PlainText` – Prefer plain text.
* (Additional `Format:*` or other switches can be added as needed.)

> **Crucial:**
> `Quiet` and `Verbose` are **Switches**, not values of `mode`.
> The `mode` field is reserved for future domain-specific modes and may be omitted or set to `"n/a"`.

Packets carry switches as:

```yaml
switches:
  - "Quiet"
  - "Format:Markdown"
```

---

## 3. Core Packet Schema

A context packet is typically represented as a **YAML object** with a small set of required fields and several optional ones.

### 3.1 Minimal required fields

Every packet must include at least:

* `origin` – Who/what produced this packet.

  * Examples: `"Alchemist"`, `"Resonant"`, `"Architect"`, `"Executor"`, `"Horizon"`
* `phase` – One of the canonical phases: `Discover | Decide | Design | Build | Review`.
* `persona` – The persona in effect when this packet was generated.
* `state` – Current runtime state (`deep_focus`, `faded_focus`, etc.).
* `problem_statement` – One-sentence summary of the work this packet addresses.
* `assumptions` – List of assumptions being made.
* `constraints` – List of constraints and invariants.
* `requirements` – List of what must be achieved/answered/produced.
* `inputs` – List of references to relevant docs, notes, or prior packets.
* `recommendations` – Suggested next actions or decisions.
* `handoff_targets` – Who/what is expected to act on this next.

These fields define the **contract for a handoff**.

### 3.2 Recommended optional fields

The following fields are recommended and will become standard over time:

* `switches` – List of switches (e.g. `["Quiet"]`, `["Verbose", "Format:Markdown"]`).
* `mode` – Reserved for domain-specific modes; may be `"n/a"` or omitted.
* `action` – Persona-specific action verb (e.g. `"Align"` for Resonant).
* `artifact` – Artifact type (e.g. `"Report"`, `"Spec"`).
* `intent_label` – Compact `Persona.Action.Artifact` string.
* `timestamp` – Optional ISO-8601 string for logging (`"2025-01-15T10:32:00Z"`).
* `meta` – Free-form nested object for additional metadata (IDs, links, etc.).

The Protocol is **extensible**: additional keys are allowed as long as:

* they don’t change the meaning of the required fields,
* and they don’t overload existing field names.

---

## 4. Packet Examples

### 4.1 Research → CE handoff (Resonant → Architect)

**Phase:** Decide
**Persona:** Resonant
**Action:** Align
**Artifact:** Report

```yaml
origin: "Resonant"
phase: "Decide"
persona: "Resonant"
state: "deep_focus"
mode: "n/a"
switches:
  - "Quiet"
  - "Format:Markdown"

problem_statement: >
  Evaluate whether the proposed dev plan for feature X is aligned with
  Jared's values, neurotype, and strengths, and suggest adjustments if not.

assumptions:
  - "The current plan in ce/Architect.Plan.Spec.feature-x.v1.md is technically feasible."
  - "Time available is ~5 hours/week for this project."
constraints:
  - "Avoid plans that require sustained 3+ hour focus blocks."
  - "Respect existing energy and health limits."
requirements:
  - "Call out where the current plan fits or fights values, neurotype, and strengths."
  - "Recommend concrete adjustments to scope, tempo, or channels."
inputs:
  - "ce/Architect.Plan.Spec.feature-x.v1.md"
  - "arcs/values/raw.md"
  - "arcs/neurotype/raw.md"
  - "arcs/strengths/raw.md"

action: "Align"
artifact: "Report"
intent_label: "Resonant.Align.Report"

recommendations:
  - "Hand off to Architect to revise the plan if misalignments are significant."
  - "If alignment is good enough, Architect should proceed to a minor Spec update only."
handoff_targets:
  - "Architect"
```

### 4.2 CE → Dev handoff (Architect → Executor)

**Phase:** Design
**Persona:** Architect
**Action:** (e.g. `Plan`)
**Artifact:** Spec

```yaml
origin: "Architect"
phase: "Design"
persona: "Architect"
state: "deep_focus"
mode: "n/a"
switches:
  - "Quiet"
  - "Format:Markdown"

problem_statement: >
  Translate the aligned direction for feature X into a concrete implementation
  plan that Executor or Slate can follow without guessing.

assumptions:
  - "Resonant's alignment report for feature X has been accepted."
constraints:
  - "Avoid long-running branches with no visible progress."
  - "Prefer 2–10 minute operators that can be logged individually."
requirements:
  - "Specify files to create/edit."
  - "Define done-conditions and test checks."
  - "Outline 2–10 minute operators for Slate/Executor."
inputs:
  - "history/2025/2025-01-15_Resonant.Align.Report.feature-x.yaml"
  - "arcs/overview/raw.md"

action: "Plan"
artifact: "Spec"
intent_label: "Architect.Plan.Spec"

recommendations:
  - "Hand off to Executor with autonomy level medium for Build."
handoff_targets:
  - "Executor"
```

### 4.3 Dev → Review handoff (Executor → Horizon)

**Phase:** Review
**Persona:** Executor
**Action:** (e.g. `Build` or `Vet`)
**Artifact:** Report

```yaml
origin: "Executor"
phase: "Review"
persona: "Executor"
state: "simple_task"
mode: "n/a"
switches:
  - "Verbose"
  - "Format:Markdown"

problem_statement: >
  Summarize what was implemented for feature X, what tests were run,
  and any deviations from the Architect.Plan.Spec.

assumptions:
  - "All changes for feature X are in the feature-x branch."
constraints:
  - "Keep the report short enough to read on a low-capacity day."
requirements:
  - "List files changed and purpose of each change."
  - "Describe test coverage and any failures."
  - "Highlight open questions or follow-ups for Horizon."

inputs:
  - "ce/Architect.Plan.Spec.feature-x.v1.md"
  - "git://feature-x diff vs main"
  - "logs/test-run-feature-x-2025-01-16.txt"

action: "Vet"         # example; the real action name may differ
artifact: "Report"
intent_label: "Executor.Vet.Report"

recommendations:
  - "Hand off to Horizon for reflection and direction setting."
handoff_targets:
  - "Horizon"
```

---

## 5. How Slate Uses the Protocol

Slate is the runtime that:

* reads context packets,
* sets `state`, `switches`, and sometimes `phase`,
* chooses personas and operators,
* and logs packets for history.

### 5.1 Inputs to Slate decisions

Slate primarily uses:

* `phase`
* `persona`
* `state`
* `switches`
* `requirements`
* `handoff_targets`
* optionally `intent_label`

**Examples:**

* **Autonomy decisions**

  * If `state: "faded_focus"` and `phase: "Decide"`, Slate may:

    * lower autonomy,
    * prefer Architect/Resonant personas,
    * and suggest smaller, safer next steps.
  * If `state: "simple_task"` and `phase: "Build"`, Slate may:

    * grant higher autonomy to Executor,
    * batch multiple small operators.

* **Operator selection**

  * If `phase: "Design"` and `intent_label: "Architect.Plan.Spec"`, Slate:

    * selects CE planning operators,
    * favors editing `ce/` and arc files.
  * If `phase: "Review"` and `intent_label: "Horizon.<ReflectAction>.Report"`, Slate:

    * selects reflection/log operators,
    * emphasizes summarization and meta-learning.

* **Output style**

  * `switches: ["Quiet"]` → minimize side chatter; focus on succinct steps.
  * `switches: ["Verbose", "Format:Markdown"]` → more explanation, headings, lists.

### 5.2 Telemetry & logging

Each major operator can:

1. Read a **previous packet** as input.
2. Produce a **new packet** as output, updating:

   * `origin` (current persona or Slate),
   * `phase` (if transitioning),
   * `persona`, `action`, `artifact`, `intent_label`,
   * `assumptions`/`constraints`/`requirements` if changed,
   * `inputs` (new files, logs),
   * `recommendations` and `handoff_targets`.

These packets can be stored in a history directory, e.g.:

* `history/2025/2025-01-15_Resonant.Align.Report.feature-x.yaml`
* `history/2025/2025-01-15_Architect.Plan.Spec.feature-x.v1.yaml`
* `history/2025/2025-01-16_Executor.Vet.Report.feature-x.yaml`

Slate (or a persona) can later **reconstruct context** by replaying this chain.

---

## 6. Implementation Notes & Conventions

### 6.1 Backwards compatibility

* Older packets that used `mode: "quiet"` or `mode: "verbose"` are still understandable, but:

  * new packets should move these to `switches`,
  * `mode` should be treated as `"n/a"` or used for domain-specific modes only.

### 6.2 Validation ideas (future)

Future tooling can:

* enforce that `phase` is one of `Discover | Decide | Design | Build | Review`,
* warn if `intent_label` doesn’t match `persona` / `action` / `artifact`,
* suggest corrections if non-canonical Actions or Artifacts are used,
* surface conflicts between `assumptions`, `constraints`, and `requirements`.

### 6.3 Usage patterns

* **Human-started tasks**

  * Human begins with a simple packet (often missing `phase`/`persona`),
  * Slate or a GPT persona fills the rest and echoes back a complete packet.

* **Persona-to-persona handoffs**

  * Each persona ends a significant chunk of work by emitting a packet.
  * The next persona explicitly consumes that packet as an input.

* **Low-capacity safety**

  * Packets should be written so that:

    * you can come back later,
    * read the last packet,
    * and know what’s next with minimal effort.

---

## 7. Quick Reference

**Required fields**

* `origin`
* `phase`
* `persona`
* `state`
* `problem_statement`
* `assumptions`
* `constraints`
* `requirements`
* `inputs`
* `recommendations`
* `handoff_targets`

**Recommended optional fields**

* `switches`
* `mode`
* `action`
* `artifact`
* `intent_label`
* `timestamp`
* `meta`

**Canonical vocabularies**

* Personas: `Alchemist`, `Resonant`, `Architect`, `Executor`, `Horizon`
* Phases: `Discover`, `Decide`, `Design`, `Build`, `Review`
* Switches: `Quiet`, `Verbose`, `Format:*` (and others as needed)
* Actions: Two per persona (see persona schema; e.g. `Align` for Resonant)
* Artifacts: `Brief`, `Proposal`, `Spec`, `Code`, `Report`, `Log`, `PromptSet`, `Diagram`

---

```yaml
origin: "Architect"
phase: "Design"
persona: "Architect"
state: "deep_focus"
mode: "n/a"
switches:
  - "Quiet"
problem_statement: "Provide a full, updated version of the MindOS Context Protocol document that reflects the corrected treatment of switches, a more concrete phase vocabulary, and integration of Persona.Action.Artifact."
assumptions:
  - "Quiet and Verbose are Switches, not mode values."
  - "Phase names should be concrete and stable, and not part of Persona.Action.Artifact."
  - "Align is a Resonant-only Action; other personas have their own action verbs."
constraints:
  - "The updated doc must be self-contained and usable as docs/mindos_context_protocol.md."
  - "The field set must remain small and human-parseable on low-capacity days."
requirements:
  - "Define the Context Protocol schema with required and optional fields."
  - "Clarify the roles of phase, persona, state, switches, action, artifact, and intent_label."
  - "Include at least one end-to-end example packet for typical handoffs."
inputs:
  - "Prior informal Context Protocol description and corrections from this conversation."
recommendations:
  - "Replace the existing mindos_context_protocol.md with this updated version, then iterate in small diffs as you refine persona actions."
  - "Update any prompts or tools that still treat quiet/verbose as mode to use switches instead."
handoff_targets:
  - "Executor"
  - "Horizon"
```
