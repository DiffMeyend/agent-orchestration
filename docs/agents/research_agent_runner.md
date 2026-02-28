# research_agent (Resonant) Manual Runner

Research work runs through the **Resonant** agent (`agent_id: "resonant"`). Slate can route ticket intents, but execution still happens manually via Codex/ChatGPT. This runner mirrors the manifest in `tools/agents/resonant.yaml`.

## Flow Overview
1. Prepare a ticket JSON envelope (see example below or `templates/ticket_triage_ticket.example.json`).
2. Open Codex/ChatGPT and paste the Runner Prompt Template.
3. Paste the ticket JSON into the `[TICKET]` section.
4. Let the model produce:
   - A `context_packet` JSON object compliant with `context/schemas/context_packet.schema.json`.
   - A Markdown brief matching `tools/agents/resonant.yaml` output sections.
5. Save files as:
   - `context/context_packets/YYYY-MM-DD_<workflow>_<slug>.json`
   - `context/briefs/YYYY-MM-DD_<workflow>_<slug>.md`
   where `<workflow>` matches the human phase (discover/decide/design/build/review). See `docs/context-packets.md` for examples.
6. Once work is older than the retention window, run `pwsh ./scripts/rotate_context_to_history.ps1 -DryRun` to preview rotation, then rerun without `-DryRun` to move artifacts into `history/YYYY/MM/<workflow>/...`.

## Ticket Envelope Format
Use this structure when sending tickets to research_agent:

```json
{
  "ticket_id": "TICKET-12345",
  "title": "Laptop fan running at max RPM",
  "description": "User reports Dell Latitude fan is running loudly immediately after login...",
  "requester": "alex.smith@sampleco.com",
  "source": "PSA",
  "created_at": "2025-11-29T09:42:00-08:00",
  "tags": ["hardware", "noise", "priority:medium"],
  "attachments": [
    {
      "type": "screenshot",
      "description": "Task Manager showing low CPU usage"
    }
  ]
}
```

Reference file: `templates/ticket_triage_ticket.example.json` (update values per ticket).

## Runner Prompt Template
Copy everything below into Codex/ChatGPT, then paste the ticket JSON where indicated.

```
You are the runtime for research_agent (Resonant) inside MindOS.

[CONTEXT FILES]
- tools/agents/resonant.yaml
- tools/agents/resonant_behavioral_engine.yaml
- context/protocol/context_pipeline.yaml
- context/schemas/context_packet.schema.json
- docs/agents/handbook.md (research_agent section)

If these files are not already loaded in this session, request the user to paste relevant excerpts before proceeding.

[TICKET]
<PASTE TICKET JSON HERE>

[OUTPUT REQUIREMENTS]
1. Produce one context_packet JSON object that is valid per context/schemas/context_packet.schema.json. Include fields:
   - origin (use Decide.Command.<state>)
   - timestamp (ISO8601 UTC)
   - agent_id = "resonant"
   - phase = "Decide"
   - action / artifact (e.g., analyze + context_packet)
   - state, intent_label, problem_statement, inputs, assumptions, constraints, frames_of_reference (optional), reference_points (optional), common_ground (optional), relevance_filter (optional), stabilization_plan (optional), open_questions
2. Produce one brief in Markdown using sections described in tools/agents/resonant.yaml (Summary, Key Facts, Risks / Unknowns, Implications, Recommended Questions for Architect/Executor).
3. Propose filenames:
   - context/context_packets/YYYY-MM-DD_<workflow>_<slug>.json
   - context/briefs/YYYY-MM-DD_<workflow>_<slug>.md
4. Return results in this format:

context_packet (context/context_packets/...json):
```json
<JSON OBJECT>
```

brief (context/briefs/...md):
```markdown
# Title
...
```

Only emit the two artifacts and the suggested filenames—no extra commentary unless clarifications are needed.
```

## How To Use
1. Open Codex/ChatGPT and paste the Runner Prompt Template.
2. Paste the ticket JSON envelope into `[TICKET]`.
3. Run the prompt; review the produced context_packet and brief.
4. Save outputs to `context/context_packets/` and `context/briefs/` using the suggested filenames.
5. Open the files in your editor, make minor edits if needed (typos, slug adjustments), and ensure metadata (workflow, phase, tags) mirrors the manifest.
6. For older work, use the rotation script with `-DryRun` first:
   ```powershell
   pwsh ./scripts/rotate_context_to_history.ps1 -RetentionDays 7 -DryRun
   pwsh ./scripts/rotate_context_to_history.ps1 -RetentionDays 7
   ```

This runner keeps research_agent grounded in the canonical agent model while allowing manual execution during v0.
