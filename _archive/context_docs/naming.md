> STATUS: ARCHIVED. Canonical machine protocol is now defined by `context/protocol/context_pipeline.yaml` and `context/schemas/context_packet.schema.json`.

# MindOS – Conventions

## Naming and structure
- Arcs: `domain/<domain>/` (preferred) or `core/<domain>/` with `model.yaml`, `raw.md`, `operator.md`. Legacy `context.yaml` naming may appear in history.
- Snippets: `tools/snippets/MindOS-*.json` (TextBlaze), `.vscode/*.code-snippets` (VS Code).
- Workflows: Research, Analysis, Creativity, Planning, Reflection with RAW/MOD/OP variants.
- Personae: Resonant, Architect, Alchemist, Executor, Horizon. Switches: Quiet, Verbose, Format.
- Regulation: PLEASE, ACCEPTS, Check the Facts, Opposite Action, Radical Acceptance.

### Persona.Action.Artifact grammar
- Use the dotted string `Persona.Action.Artifact` for packets, files, and history entries.
- **Persona** must be one of the canonical five (Alchemist, Resonant, Architect, Executor, Horizon).
- **Action** is persona-scoped (see persona models); do not reuse another persona’s verbs.
- **Artifact** captures the output shape (`Brief`, `Spec`, `Diagram`, `Report`, etc.).
- Embed the string wherever a short intent label is needed (e.g., `intent_label` in the Context Protocol). Reference: `docs/glossary.md#context-glossary-cheat-sheet` and `tools/context/mindos_context_protocol.md#25-personaactionartifact`.

## Files
- YAML: 2-space indent, UTF-8, validate via `scripts/validate_context_arcs.py`.
- Markdown: concise headings, bullets; keep intent clear and reversible.

## Editing approach
- Prefer surgical edits; preserve existing naming/metaphors.
- Ask clarifying questions before big changes; propose a short plan when uncertain.
- Do not delete/rename files without explicit instruction.
- Mark uncertainty with comments.

## Snippet rules
- TextBlaze exports use version 7, `folders[].snippets[]` with `name`, `shortcut`, `type`, `text`, `html`.
- VS Code snippets may have dotless prefixes; keep descriptions and scope explicit.
- Context Engine snippets/templates live in `tools/snippets/MindOS-ContextEngine.json` and `tools/templates/context_engine.operator.md`; reuse them instead of inventing ad-hoc SCAN/FRAME/LEVERAGE notes.

## Validation
- Run `scripts/validate_context_arcs.py` after arc changes.
- Keep schemas in `tools/schemas/` as single source of truth for validators.
