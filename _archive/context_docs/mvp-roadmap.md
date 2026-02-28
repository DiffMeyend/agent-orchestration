# Slate MVP Roadmap _(Superseded)_

> ✅ **Superseded by** `/Scratch.md`
>
> This roadmap is preserved for reference only. Use `/Scratch.md` for the live MVP scope and sequencing.

---

## Current State

| Repo | Role | Status |
|------|------|--------|
| **Mind_Matter** | Specifications | Complete - `slate_architecture.md` is canonical |
| **SLATE** | Implementation | Partial - infrastructure done, engines/agents missing |
| **BASIS** | IT automation (reference) | Working Python - CSS scoring, frame agent, branch packs |

### What EXISTS

- **MCP Runtime** (`apps/mcp-runtime/slate-runtime/src/server.ts`): 12 JSON-RPC methods
- **Context Schemas** (`libs/context-schema/`): Zod schemas for arcs, personas, glossary
- **Context Loader** (`libs/context-loader/`): Multi-format parser with validation
- **Agent Manifests** (`tools/agents/*.yaml`): YAML definitions only - no execution code

### What's MISSING for MVP

| Component | Gap |
|-----------|-----|
| **Artifact Schemas** | TaskMap, EvidencePack, DesignSpec, OptionsSet, PatchSet, ShipDecision, ContextPayload |
| **BASIS Engine** | CSS Calculator, Ten Questions extraction |
| **Extended MCP** | spawn_agent, register_artifact, create_worktree, cleanup_worktree |
| **Agent Runners** | Polymath, Executor, Horizon execution code |

---

## MVP Phases

### Phase 1: Artifact Schemas

**Location**: `libs/context-schema/src/artifacts/`

**Create**:
- `task-map.ts` (Polymath output)
- `evidence-pack.ts` (Resonant output)
- `design-spec.ts` (Architect output)
- `options-set.ts` (Alchemist output)
- `patch-set.ts` (Executor output)
- `ship-decision.ts` (Horizon output)
- `context-payload.ts` (Ten Questions structure)
- `index.ts` (re-exports)

**Modify**: `libs/context-schema/src/index.ts` to export artifacts

---

### Phase 2: BASIS Engine (CSS + Context)

**Location**: `engines/basis/` (new Nx library)

**Create**:
```
engines/basis/src/
├── ten-questions.ts      # Q1-Q10 dimension types
├── context-payload.ts    # ContextPayload builder
├── css-calculator.ts     # Port from BASIS Python
└── index.ts
```

**Decision**: ✅ **Shared YAML** - Load `css_scoring.yaml` at runtime (shared with Python BASIS repo)

**Reference**: `/Users/jaredlandt/Dev/BASIS/scripts/css/css_scorer.py`

---

### Phase 4: Extended MCP Runtime

**Modify**: `apps/mcp-runtime/slate-runtime/src/server.ts`

**Add methods**:
| Method | Purpose |
|--------|---------|
| `slate.spawn_agent` | Bootstrap agent with role + permissions |
| `slate.register_artifact` | Store versioned artifact |
| `slate.query_artifacts` | Cross-agent artifact lookup |
| `slate.create_worktree` | Isolate Executor workspace |
| `slate.cleanup_worktree` | Remove after merge/reject |
| `slate.calculate_css` | Invoke BASIS CSS calculator |

**Create**:
- `src/worktree.ts` - Git worktree ops via simple-git
- `src/artifacts.ts` - Artifact storage/versioning

---

### Phase 5: Agent Runners (Core 3)

**Location**: `agents/` (new Nx libraries)

#### 1. Polymath (`agents/polymath/`)
- Produces: TaskMap
- Permissions: read-only at all autonomy levels
- Purpose: Divergent exploration, surface unknowns

#### 2. Executor (`agents/executor/`)
- Produces: PatchSet
- Permissions: write_files_in_worktree at L2+
- Purpose: Only agent that touches code, isolated in git worktree

#### 3. Horizon (`agents/horizon/`)
- Produces: ShipDecision + ReleaseNotes
- Permissions: read-only + verification tests
- Purpose: Review, verify, decide ship/iterate/reject

**Each runner needs**:
- `runner.ts` - Main execution logic
- `permissions.ts` - Tool allowlist per autonomy level
- `artifact-producer.ts` - Validates output against schema

---

## Critical Path

```
Phase 1 (Artifact Schemas)
        ↓
Phase 2 (BASIS Engine)
        ↓
Phase 4 (MCP Extension)
        ↓
Phase 5 (Agent Runners)
        ↓
[Ship MVP]
```

---

## MVP Delivers

End-to-end pipeline: **Task → Polymath → Executor → Horizon → ShipDecision**

---

## Post-MVP (Deferred)

- **Phase 3**: MIND Engine - capacity rules, regulation tools, State×CSS matrix
- **Phase 6**: Permission Matrix - enforcement hardening
- **Phase 7**: Full Testing - expand coverage
- **Remaining Agents**: Resonant, Architect, Alchemist runners

---

## Verification

### Per-Phase

1. **Phase 1**: `nx test context-schema` - all artifact schemas validate
2. **Phase 2**: `nx test basis` - CSS scores match Python reference
3. **Phase 4**: MCP methods respond via JSON-RPC
4. **Phase 5**: Agents produce valid artifacts

### MVP End-to-End

1. Submit task via `slate.route_task`
2. Polymath produces TaskMap (verify read-only)
3. Executor produces PatchSet in worktree (verify isolation)
4. Horizon produces ShipDecision
5. Verify worktree cleanup after decision

---

## Decisions Made

1. ✅ **CSS rules**: Shared YAML between BASIS (Python) and SLATE (TypeScript)
2. ✅ **Scope**: MVP first (Phases 1, 2, 4, 5), iterate after
3. ✅ **QF-Wiz**: Keep separate in BASIS repo, integrate via OCP later
4. ✅ **Worktrees**: One per Executor invocation, cleanup after merge/reject
