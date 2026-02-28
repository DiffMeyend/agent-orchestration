# MindOS Context Arcs

## What a Context Arc Is
- A Context Arc is a structured model of a domain (identity, work, regulation) that captures actors, motives, constraints, timing, and implementation hooks.
- Arcs exist to make behavior and decision logic explicit so humans and agents can align actions to values, neurotype, and goals under real-world stress.
- They express how a context behaves: what drives it, what constrains it, how it presents, and how to act within it.

## Arc Components (3 Views)
### 1. raw.md
- Purpose: narrative, story, origin, nuance; captures history, examples, and felt sense.
- Human use: reflection, journaling, therapy-processing; reference when you need texture beyond checklists.

### 2. model.yaml (formerly context.yaml)
- Purpose: structured context model for machines and humans who need the “shape” without prose.
- Required fields: `ce_header` (entities, features, tasks) and `context_arc` (actors, motives, constraints, environment, codes, temporality, framing, reference_points, reflection, implementation), following `tools/schemas/context_arc.schema.yaml`.
- Registry linkage: arcs should be discoverable via `registry/registry.index.yaml` and map to shared axes (e.g., `strengths`, `values`, `dbt_skills`, `neurotype`, `domains`).
- Validation: run `scripts/validate_context_arcs.py` (use `.venv/bin/python scripts/validate_context_arcs.py` if needed) after edits; keep YAML compliant with schema.

### 3. operator.md
- Purpose: real-time guidance and checklists for operating inside the arc’s context.
- Under stress: minimal steps, clear agent/mode cues, and observable exit conditions.
- Agents/Switches: call out recommended agent (Alchemist … Horizon) and switches (Quiet/Verbose/Format) when relevant.

## How Arcs Plug Into MindOS
- Shared axes: arcs reference common axes (strengths, values, DBT skills, neurotype, domains) to stay interoperable.
- Cross-arc relationships: arcs can point to shared axes in the registry to express overlap and tension (e.g., work arcs reusing strengths/values; regulation arcs binding to DBT skills).
- Navigation: humans skim `docs/overview.md` + arc operators; agents traverse `registry.index.yaml` to locate arcs by axis/domain and read `model.yaml` for structure.

## Creating a New Arc
- When: a context/domain recurs and needs reusable structure (new workflow domain, identity facet, regulation pattern).
- Steps:
  1) Copy templates from `tools/templates/` (`arc.template.yaml`, `raw.template.md`, `operator.template.md`).
  2) Place files under the appropriate path in `domain/` (preferred) or `core/`, keeping `raw.md`, `model.yaml`, `operator.md` together.
  3) Populate `model.yaml` with actors, motives, constraints, codes, temporality, environment, framing, reference_points, reflection, implementation.
  4) Write `raw.md` with narrative and examples; write `operator.md` with runtime steps/agent/mode cues.
  5) Add the arc to `registry/registry.index.yaml`, mapping it to shared axes.
  6) Run `scripts/validate_context_arcs.py` to ensure schema compliance.

## Minimal Example
```
arc_folder/
  raw.md        # narrative and examples
  model.yaml    # structured arc (ce_header + context_arc fields per schema)
  operator.md   # runtime checklist
```

## Domain arcs (example)
- `domain/work/ascend/` is a domain arc using the three-view structure (raw.md, model.yaml, operator.md).

## Best Practices
- Composable: reuse shared axes; avoid bespoke fields that break schema interoperability.
- Clear: short headings, tight bullets, explicit actors/motives/constraints; keep modes/agents visible.
- Constraint discipline: name tradeoffs and limits; avoid vague “it depends.”
- Avoid duplication: reference registry axes instead of redefining strengths/values/DBT skills per arc.
- Respect agent/switch layers: recommend agent and switch defaults in operators when it matters.

## Future Direction
- Expand arcs to additional domains (work contexts, creative, health) while keeping shared axes consistent.
- Strengthen registry links for better navigation and agent discovery.
- Add more operator hooks for snippets/tools as patterns stabilize.
