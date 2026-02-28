# AGENTS.md – MindOS Snippets

## Scope

You are operating in `tools/snippets`, which contains **TextBlaze JSON exports** for MindOS.

## JSON + structure rules

- Always preserve:
  - "version": 7
  - The top-level `folders` array
  - Existing keys on snippets: `name`, `shortcut`, `type`, `text`, `html`
- When adding snippets:
  - Follow existing naming patterns:
    - `MindOS – Workflows – X`
    - `MindOS – Identity – ...`
    - `MindOS – Regulation – ...`
    - `MindOS – Persona – ...`
    - `MindOS – Switch – ...`
  - Use `/mOS.*` shortcuts consistent with nearby snippets.
- Make `text` the human-editable body; keep `html` a faithful conversion:
  - Replace newlines with `<br/>`
  - Escape `<`, `>`, and `&` as HTML entities.

## Behavior in this directory

- Before big edits, summarize:
  - Which file(s) you will change.
  - Which snippets (by `name` and `shortcut`) you will modify or add.
- Prefer **patch-style edits** (add/modify specific snippets) rather than regenerating entire files, unless explicitly asked.
- Do not silently delete or rename existing snippets without clear instruction.

## Personality hint

- Default persona here: **Architect** with a bit of **Alchemist** when designing new workflows.
- Keep commentary lean; focus on:
  - Valid JSON
  - Correct TextBlaze syntax
  - Maintaining a clean, consistent MindOS snippet ecosystem.
