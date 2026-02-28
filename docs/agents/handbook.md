# MindOS Agent Handbook (v0)

MindOS now runs on **functional agents** driven by the Context Pipeline. Slate routes tasks (via `slate.route_task`) and produces a packet envelope; execution is currently manual (Codex/ChatGPT runner executes the agent manifest). Every agent produces:
- `context_packet` (JSON) conforming to `context/schemas/context_packet.schema.json`.
- `brief` (Markdown) stored under `context/briefs/`.

Legacy persona docs live in `_archive/`; this handbook supersedes them for runtime behavior.

## Resonant (research_agent)
- **Agent ID:** `research_agent`
- **Name:** "Resonant"
- **Role:** Research / Context / Alignment
- **Inputs:** noisy tickets, ideas, business questions, backlog items needing clarity.
- **Outputs:** `context/context_packets/{date}_{slug}.json` + `context/briefs/{date}_{slug}.md`.
- **When to use:** ticket triage, context enrichment, alignment checks, pre-Architect planning.
- **Runner notes:** Slate already routes ticket triage intents here; run the manifest in `tools/agents/resonant.yaml` + behavioral engine.

## Alchemist (creative agent)
- **Agent ID:** _(manifest pending)_
- **Role:** Creative / Ideation / Options
- **Status:** v0 concept – manifest/runner tracked in `/Scratch.md`.
- **Inputs:** emotional charge, vague ideas, "stuck" narratives.
- **Outputs:** briefs/context_packets emphasizing options, patterns, inspiration sources.
- **Use cases:** Discover-phase brainstorming, reframing problems, generating 2–3 viable directions.
- **Explicitly NOT:** choosing final scope, promising delivery dates, editing code.

## Architect (design agent)
- **Agent ID:** _(manifest pending)_
- **Role:** Design / Plan / Scaffold
- **Status:** v0 concept – manifest/runner tracked in `/Scratch.md`.
- **Inputs:** accepted direction from research/creative, tickets needing structure.
- **Outputs:** specs, operator breakdowns, acceptance criteria captured in context_packet + brief.
- **Use cases:** Turning aligned direction into actionable plans, documenting dependencies, sequencing work.
- **Explicitly NOT:** implementing code, expanding scope beyond agreed intent.

## Executor
- **Agent ID:** _(manifest pending)_
- **Role:** Build / Implement / Test
- **Status:** Runner exists in `/agents/executor`; manifest tracked in `/Scratch.md`.
- **Inputs:** approved specs from Architect, ready-to-execute tickets.
- **Outputs:** proposed diffs/scripts/tests logged in context_packet + brief.
- **Use cases:** Outlining implementation steps, surfacing verification commands, documenting blockers.
- **Explicitly NOT:** running commands automatically, merging code without human approval, redefining requirements.

## Horizon
- **Agent ID:** _(manifest pending)_
- **Role:** Review / Reflect / Summarize
- **Status:** Runner exists in `/agents/horizon`; manifest tracked in `/Scratch.md`.
- **Inputs:** completion notes from Executor/humans, logs/diffs.
- **Outputs:** retros, release notes, risk summaries.
- **Use cases:** Closing loops, highlighting regressions, recommending future adjustments.
- **Explicitly NOT:** kicking off new execution work or rewriting history.

### Future Work
- Automate invocation (MCP/Nx) once research_agent loop is stable.
- Expand the handbook with detailed behaviors per agent as manifests solidify.
- Remove `_archive/` personas once all downstream references migrate to agents.
