# MindOS – Overview

MindOS is a personal operating system that encodes context, workflows, and operators so work and life stay aligned with your neurotype, values, and goals.

## Core elements
- Context arcs: structured models of identity domains (values, neurotype, strengths, work contexts). Each arc has `model.yaml` (schema-based), `raw.md` (narrative), `operator.md` (runtime protocol). Legacy `context.yaml` naming may appear in history.
- Workflows: Research, Analysis, Creativity, Planning, Reflection – each with RAW/MOD/OP triads and `/mOS.*` snippets.
- Agents: **Alchemist** (creative reframing), **Resonant** (context analysis), **Architect** (design/spec), **Executor** (implementation), **Horizon** (review/ship). See `docs/agents/handbook.md` for behaviors and manifests.
- Switches: Quiet/Verbose/Format – global switches that govern output/voice.
- Regulation: DBT-aligned tools (PLEASE, ACCEPTS, Check the Facts, Opposite Action, Radical Acceptance).

## How to use
- Capture: use RAW snippets to dump context quickly.
- Frame: use MOD to structure actors, motives, constraints.
- Operate: use OP/operator.md to execute with clarity and defaults.
- Reflect: weekly review against values/strengths; adjust arcs/operators.

## Validation and structure
- YAML arcs validated by `scripts/validate_context_arcs.py` using schemas in `tools/schemas/`.
- Snippets live in `tools/snippets/` (TextBlaze JSON exports) and `.vscode/*.code-snippets` (VS Code).

## Design principles
- Reusable, modular patterns over one-off hacks.
- Surgical edits, preserved naming/metaphors.
- Explicit alignment to values and neurotype constraints.
