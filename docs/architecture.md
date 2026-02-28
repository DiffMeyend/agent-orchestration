# MindOS – Architecture

## Components
- Context arcs (`core/**`, `domain/**`): each has `model.yaml` (schema-driven), `raw.md` (narrative), `operator.md` (runtime protocol). Legacy `context.yaml` exists only in history.
- Schemas (`tools/schemas/`): JSON Schema definitions (e.g., context arcs, registry).
- Snippets (`tools/snippets/`, `.vscode/*.code-snippets`): TextBlaze exports and VS Code triggers for workflows, agents, switches, regulation, debug.
- Scripts (`scripts/`): validators (e.g., `validate_context_arcs.py`).
- Docs (`docs/`): overview, conventions, glossary, architecture.

## Data flow
- Author/update arcs in YAML/Markdown → run `scripts/validate_context_arcs.py` to ensure schema compliance.
- Use snippets to inject workflows/agents/switches into chat/notes → operate against arcs/operators.
- Operators provide runtime checklists to apply arcs and workflows consistently.

## Patterns
- RAW / MOD / OP triads per workflow; Agent/Switch/Regulation as modifiers.
- Naming: `MindOS – <Domain> – <Variant>`; `/mOS.*` shortcuts in TextBlaze; dotless variants in VS Code.
- Modularity: schemas + snippets + operators are small, composable units.

## Context Engineering Manifesto alignment
- `docs/agents/handbook.md` encodes manifesto tenets (clarity over noise, context-as-architecture, iteration, integrity) so agent shifts stay value-aligned. Legacy persona models live under `_archive/`.
- `tools/agents/slate.yaml` mirrors the same commitments inside Slate’s `core_rules` and integration notes, ensuring runtime autonomy decisions respect the manifesto.
- Future connectors and operators should cite these principles when adding agents, switches, or automation entry points.

## Extensibility
- Add new arcs: follow existing folder structure; add schema entry if needed; include raw/operator docs.
- Add snippets: extend TextBlaze JSON under `tools/snippets/` and regenerate VS Code packs if desired.
- Add operators: lightweight Markdown protocols co-located with arcs.
