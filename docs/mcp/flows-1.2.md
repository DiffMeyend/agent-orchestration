Lifecycle Tag: Pending induction into MindOS dev workflow

---

## 1. Runtime & Workspace Model

### 1.1 Runtime lifecycle
- The VS Code extension launches the Slate MCP Runtime (`node mcp/slate-runtime/dist/server.js`) through `SlateMcpClient.ensureStarted()` once per session, injecting manifest/history paths plus the shared token.
- When the Slate MCP Runtime exits, the client logs “Slate MCP Runtime exited,” clears pending RPC calls, and leaves restart work to the user (`Slate: Start Session` or VS Code reload). There is no dedicated restart command today—only Start Session (spawn) and Deactivate (kill).

### 1.2 Workspace assumptions
- The extension expects the VS Code workspace root to be the MindOS repo; it defaults manifest/history paths accordingly (`tools/agents/slate.yaml`, `.meyend/history.json`).
- Non-MindOS workspaces fail with missing manifest/snippets errors because there is no context switch or fallback flow.
- Paths are sanitized yet remain relative to the workspace unless explicitly overridden with absolute locations; only `~` expansion is supported—no OS-specific branching.

### 1.3 Communication channel
- All traffic runs over JSON-RPC on stdin/stdout between the extension and the Slate MCP Runtime.
- Future triggers (file-based, direct LLM hooks, etc.) must continue to treat the Slate MCP Runtime as the canonical interface; any new pathway should ride atop the same runtime contract. See `Documentation/mcp_glossary.md` + `Documentation/mcp_flow.md` for the shared vocabulary and host/client/server mapping.

## 2. History Persistence

### 2.1 Growth controls
- History currently grows indefinitely because every state/Quiet-Verbose switch/autonomy event is appended without rotation.
- Target: rotate (keep last N events or cap at ~5–10 MB) and expose a `Slate: Purge History` command or automatic cleanup so the log cannot balloon forever.

### 2.2 Corruption handling
1. Attempt to parse; if parsing fails, rename the file to `history.json.corrupt-<timestamp>`.
2. Recreate the log from scratch (empty array) so the runtime keeps working.
3. Surface a toast + telemetry panel warning inside VS Code so the user knows persistence failed.

### 2.3 Data to retain
- Keep meaningful events only: state changes, Quiet/Verbose switch changes, autonomy decisions, and error/failure events for auditability.
- Defer snippet usage or command logging until a concrete workflow requires that fidelity; otherwise it becomes noise.
- Any additional event type should be justified and added deliberately after the above “core four” stabilize.

## 3. Autonomy, State, and Mode

### 3.1 Autonomy today
- Confidence in the autonomy definitions is medium: the manifest nails L0–L3 semantics, yet the runtime only consumes the static defaults per state from `tools/agents/slate.yaml` and `mcp/slate-runtime/src/manifest.ts`.
- Treat L0–L3 as fixed gears; renaming would ripple across contracts. Adaptation should happen by tuning per-state task mappings rather than redefining the gears themselves.
- `decide_autonomy` is static table lookup; dynamic adaptation would require additional signals (history, telemetry, manual overrides) evaluated per decision.
- Slate never overrides the user’s requested switches or state. Future guardrails should recommend when a request conflicts with manifest defaults (e.g., asking for L3 while `#state:faded_focus`) but still wait for explicit confirmation.

### 3.2 State and Quiet/Verbose switch changes
- `slate.set_state` and `slate.set_mode` (the Quiet/Verbose switch setter) only run when explicitly invoked (see `mcp/slate-runtime/src/server.ts`, `runtimeState.ts`, `switches.ts`). No background watcher adjusts them.
- Proactive adjustments would require agreed triggers (time since last change, repeated L0 decisions, external signals) plus audit logs marking the source as `runtime`.
- Guardrails if auto-adjust is enabled: nudge only toward manifest defaults, limit to one nudge per session unless confirmed, and expose `/mOS.switch.autonomy` (or similar) to toggle “auto-adapt” for transparency.

### 3.3 Inference vs. explicitness
- Behavior rules already bias toward “ask first” (“Resolve ambiguity with precise questions…” and “Prefer the smallest operator…” in `tools/agents/slate.yaml`).
- Deep-focus, low-risk flows can permit limited inference: Slate may pick autonomy, draft plans, and execute while reporting checkpoints.
- `faded_focus` / complex states should halt at hypotheses—recommend switches or workflow snippets, but do nothing until the user approves.
- Next autonomy upgrades: log when the user overrides manifest defaults, add an `auto_adjust` flag to the runtime snapshot, and analyze history to tune the manifest table.

## 4. Switches, Snippets, and Recommendations

### 4.1 Switch taxonomy
- Only the Quiet/Verbose switch is implemented today via `set_mode`/`get_mode`, yet the pattern scales. Aim for 5–7 first-class switches (tone, coaching vs. execution, safety strictness, response length, code style bias, etc.).
- Define switch metadata (allowed values, defaults per state) in the manifest so every runtime shares the same contract; keep actual switch positions in runtime state for per-session overrides and audit logs.
- Expose user-facing switches in UI/snippets and log all changes like other history events. Keep any internal-only flags limited and deliberate (e.g., safety kill switch, experiment gate).

### 4.2 Snippet editing and refresh
- Treat snippets as first-class MindOS assets under `tools/snippets/`; edit/version them in VS Code like any other file.
- Use existing RPCs (`slate.list_snippets`, `slate.refresh_snippets`) to reload changes. Watching the snippet folder or periodically calling refresh avoids runtime restarts.

### 4.3 Snippet recommendations
- Command invocation stays the primary execution trigger.
- Layer optional state-aware nudges: when `decide_autonomy` recommends L1 for `#state:faded_focus`, surface “Consider `/mOS.workflow.recovery`” without executing automatically.
- Make the recommendation channel explicit and switchable so Jared can silence it if it feels noisy.

## 5. Execution, Permissions, and Stability

-### 5.1 Code execution posture
- Slate does not run scripts/tests yet, but autonomy planning assumes it eventually will.
- When execution lands: run everything in a sandbox, prompt before destructive or out-of-repo operations, and log every command (state + Quiet/Verbose switch context) via `mcp/slate-runtime/src/history.ts`. L2 should require confirmation for risky steps; L3 may run small pre-approved commands.

### 5.2 Authentication
- The current single shared token works solo but hampers revocation and audit in multi-repo setups.
- Target: one token per workspace manifest, stored with the runtime state metadata, optional rotation (e.g., 90-day TTL), plus CLI helpers to issue/revoke tokens.

### 5.3 Crash handling
- Auto-restart the JSON-RPC worker, emit a VS Code notification, and append a crash event to history/logs.
- Capture crash dumps (stack trace + last request) under `~/.meyend/logs/` for later inspection. If restart fails twice, stop and surface a blocking prompt to avoid thrash.

### 5.4 Shared or multi-user environments
- Default to conservative caps: Quiet switch + L1 autonomy until the user opts in to higher levels.
- Require confirmation for filesystem/network commands, gate L3/autonomous execution, and reduce snippet auto-suggestions unless the “full” profile is authorized. Provide opt-in switches to relax constraints once trust is earned.

## 6. Distribution and Portability

### 6.1 Publishing path
- Keep distribution repo-centric for now: ship the VS Code extension through GitHub Releases where access can be gated and contextualized with MindOS assets.
- VS Code Marketplace is viable once auth and safe defaults harden; until then, Releases + documentation keeps install base manageable.

### 6.2 Portability
- Provide a bootstrap installer that clones the repo, installs dependencies, seeds `tools/agents/slate.yaml`, and prompts for tokens. Treat MindOS as required context; running without it sheds workflows/snippets.
- Offer a CLI check that validates the manifest and copies baseline snippets to keep multi-machine setups aligned.

### 6.3 Shared contracts
- Package `tools/slate-contracts` as an npm module once interfaces stabilize. Exporting the runtime contracts via a published package unlocks semver and easier reuse compared to local relative imports or git submodules.

## 7. Direction
- Slate is the personal orchestration layer for MindOS—a co-engineer that understands workflows, agents, and switches, then sequences the right operators at the right autonomy level.
- The manifest (`tools/agents/slate.yaml`) already frames Slate as “Co-engineer, orchestration stabilizer, context-driven executor,” and the runtime (`mcp/slate-runtime`) enforces that contract via history, autonomy decisions, and switch control.
- The roadmap above brings it from “pending induction” to a reliable subsystem: tighten persistence, formalize switches, add guarded autonomy, and ship a portable, token-aware runtime that can eventually run commands safely.
- Legacy persona descriptions are archived under `_archive/`; active runtimes must use the agent IDs defined in `docs/agents/handbook.md`.
