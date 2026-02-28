# Context Packets & Briefs – Naming and Rotation

MindOS keeps short-lived briefing artifacts under `context/briefs/` and structured context packets under `context/context_packets/`. This document captures the conventions every workflow follows so rotation scripts and agents can reason about lineage.

## Naming Conventions

### Briefs (`context/briefs/`)
- File name: `YYYY-MM-DD_<workflow>_<slug>.md`
- `workflow`: discover | decide | design | build | review (aligned to agent families). Additional subworkflows may live in nested folders (`context/briefs/<workflow>/...`).
- `slug`: hyphenated short description (ticket id, feature codename, etc.).
- Markdown sections follow the template in `resonant.yaml` (Summary, Key Facts, Risks, Implications, Recommended Questions).

### Context Packets (`context/context_packets/`)
- File name: `YYYY-MM-DD_<workflow>_<slug>.json`
- JSON must validate against `context/schemas/context_packet.schema.json`.
- `workflow` uses the same vocabulary as briefs to keep handoffs traceable.
- If a packet includes run-specific metadata (session, CSS score), keep it inside the `metadata` block—file names stay clean.

### Directory Structure
- Optional subdirectories under `context/briefs/` and `context/context_packets/` can further bucket by workflow (e.g., `context/briefs/design/2026-02-01_design_auth.md`). Rotation scripts treat the first subdirectory as the workflow if present.
- If no subdirectory exists, the workflow is inferred from the filename slug; scripts fall back to `ticket_triage`.

## Rotation & Archival Rules

Artifacts stay “hot” in the `context/` tree for rapid access. Older items rotate into `history/YYYY/MM/<workflow>/` so the working set stays lean.

### Rotation Policy

| Artifact Type   | Retention (days) | Rotation Target |
|-----------------|------------------|-----------------|
| Briefs (`*.md`) | 7 (default)      | `history/YYYY/MM/<workflow>/briefs/` |
| Packets (`*.json`) | 7 (default)   | `history/YYYY/MM/<workflow>/context_packets/` |

Use `scripts/rotate_context_to_history.ps1` to perform the rotation. The script:
1. Scans `context/context_packets/` and `context/briefs/`.
2. Infers workflow from subdirectory or filename.
3. Moves artifacts older than the retention window into the history tree.
4. Supports `--DryRun` for previewing moves and logs every action with timestamps.

### Running the Script

```powershell
# Preview moves
pwsh ./scripts/rotate_context_to_history.ps1 -RetentionDays 10 -DryRun

# Execute rotation
pwsh ./scripts/rotate_context_to_history.ps1 -RetentionDays 10
```

Adjust `-RetentionDays` per workflow if needed. Always run with `-DryRun` first when testing new folder layouts.

### Archival Notes
- Never delete rotated artifacts; history acts as the canonical archive.
- Agents should reference `history/` for long-lived context via resource URIs, not by reopening files in `context/`.
- When a history folder crosses 10k files, create an additional `<workflow>/archive/` subfolder and document the split in `history/README.md`.
