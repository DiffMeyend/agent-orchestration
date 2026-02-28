# Slate Architecture Implementation Plan _(Superseded)_

> ✅ **Superseded by** `/Scratch.md`
>
> This file is retained for historical context only. Refer to `/Scratch.md` for the active implementation tasks and backlog.

---

## Overview

Extend the existing SLATE codebase to implement the slate_architecture.md specification. Focus on engines-only (no product packaging).

## What Already Exists

### Infrastructure (Complete)
- Nx monorepo with TypeScript, Zod, gray-matter
- MCP Runtime (`apps/mcp-runtime/slate-runtime/`) with:
  - `slate.set_state` / `slate.get_state` - Runtime state management
  - `slate.decide_autonomy` - Maps state × taskType → L0-L3
  - `slate.route_task` - Routes to research_agent
  - History persistence, snippet catalog, logging

### Libraries (Complete)
- `libs/context-schema/` - Zod schemas (CoreArc, DomainArc, Persona, etc.)
- `libs/context-loader/` - YAML/MD/JSON parser + validator
- `tools/snippets/slate-contracts/` - RuntimeState, Autonomy, History types

### Agent Manifests (YAML definitions only)
- `slate.yaml` - Orchestrator with 4 runtime states, autonomy rules
- `resonant.yaml` - Research agent (read-only)
- Executor/Horizon/Architect/Alchemist manifests – **TODO** (legacy YAMLs archived)

### Context Knowledge Base
- Core arcs: values, strengths, neurotype
- Domain arcs: work, home
- Snippets: 19 TextBlaze JSON packs

## What's Missing (from slate_architecture.md)

| Component | Status | Gap |
|-----------|--------|-----|
| BASIS Engine | Not started | Frame Discovery, Ten Questions, CSS calculation |
| MIND Engine | Partial | Capacity rules, regulation tools, State×CSS matrix |
| Agent Runners | Not started | Only manifests exist, no execution engines |
| Artifact Schemas | Not started | TaskMap, EvidencePack, DesignSpec, OptionsSet, PatchSet, ShipDecision |
| Permission Matrix | Not started | Enforcement per agent × autonomy level |
| Worktree Isolation | Not started | Executor sandbox |
| Automated Tests | Not started | Only script-based validation exists |

---

## Implementation Plan

### Phase 1: Artifact Schemas

**Goal**: Add artifact type definitions to existing schema library

**Location**: `libs/context-schema/src/artifacts/`

**Files to create**:
- `task-map.ts` - TaskMap schema (Polymath output)
- `evidence-pack.ts` - EvidencePack schema (Resonant output)
- `design-spec.ts` - DesignSpec schema (Architect output)
- `options-set.ts` - OptionsSet schema (Alchemist output)
- `patch-set.ts` - PatchSet schema (Executor output)
- `ship-decision.ts` - ShipDecision + ReleaseNotes schemas (Horizon output)
- `context-payload.ts` - Context Payload with Ten Questions structure
- `index.ts` - Re-export all

Schemas per [slate_architecture.md lines 686-835](https://github.com/jaredlandt/Mind_Matter/blob/main/docs/slate_architecture.md#artifact-schemas)

---

### Phase 2: BASIS Engine

**Goal**: Implement context assembly engine

**Location**: `engines/basis/` (new Nx library)

**Files to create**:
```
engines/basis/
├── src/
│   ├── frame-discovery.ts     # Disambiguate situation type
│   ├── branch-collapse.ts     # Prune invalid decision paths
│   ├── context-extraction.ts  # Answer Ten Questions
│   ├── css-calculator.ts      # Context Stability Score
│   ├── decision-matrix.ts     # Score options against constraints
│   └── index.ts
├── project.json
└── tsconfig.json
```

**Key logic** (from cntxt-wiz.md):
- Frame Discovery: confidence < 0.7 triggers clarifiers
- CSS: weighted average (Q1, Q2, Q4, Q9 weighted 2.0x)
- Staleness decay: 1.0 at capture → 0.5 after 24h

---

### Phase 3: MIND Engine

**Goal**: Implement operator state engine (extend existing)

**Location**: `engines/mind/` (new Nx library)

**Files to create**:
```
engines/mind/
├── src/
│   ├── state-machine.ts       # fresh → mid → faded/high_pressure
│   ├── state-detector.ts      # Indicator thresholds
│   ├── autonomy-resolver.ts   # State × CSS → L0-L3
│   ├── capacity-rules.ts      # Overload/underload triggers
│   ├── regulation-tools.ts    # DBT skills integration
│   └── index.ts
├── project.json
└── tsconfig.json
```

**State × CSS Autonomy Matrix** ([slate_architecture.md:209-217](https://github.com/jaredlandt/Mind_Matter/blob/main/docs/slate_architecture.md#state--css-autonomy-matrix)):

```
           CSS<30   CSS 30-59   CSS 60-89   CSS 90+
fresh        L0        L1          L2         L3
mid          L0        L1          L2         L2
faded        L0        L0          L1         L1
high_p       L0        L1          L1         L2
```

---

### Phase 4: Agent Runners

**Goal**: Implement agent execution engines (not just manifests)

**Location**: `agents/` (new Nx libraries)

**Priority order**:
1. `polymath/` - Produces TaskMap, read-only
2. `executor/` - Produces PatchSet, worktree isolated
3. `horizon/` - Produces ShipDecision, gates merges

Each agent runner needs:
- `runner.ts` - Main execution logic
- `permissions.ts` - Tool allowlist per autonomy level
- `artifact-producer.ts` - Validates output against schema

**Executor-specific**:
- Worktree creation via simple-git
- Command capture (stdout/stderr)
- Test result parsing

---

### Phase 5: Extend MCP Runtime

**Goal**: Add missing Supervisor methods

**Location**: `apps/mcp-runtime/slate-runtime/server.ts`

**Methods to add**:
```typescript
// Already exists:
slate.set_state, slate.get_state, slate.decide_autonomy, slate.route_task

// New methods needed:
slate.spawn_agent       // Bootstrap agent with role + worktree
slate.enforce_perms     // Validate tool call against permission matrix
slate.register_artifact // Store versioned artifact
slate.query_artifacts   // Cross-agent artifact lookup
slate.create_worktree   // Isolate Executor workspace
slate.cleanup_worktree  // Remove after merge/reject
slate.gate_merge        // Only allow after Horizon.ship
slate.calculate_css     // Invoke BASIS CSS calculator
```

---

### Phase 6: Permission Matrix Enforcement

**Goal**: Implement per-agent × autonomy permission checks

**Location**: `libs/context-schema/src/permissions/`

**Permission matrix** (from [slate_architecture.md:471-507](https://github.com/jaredlandt/Mind_Matter/blob/main/docs/slate_architecture.md#permission-matrix)):

```yaml
executor:
  L0: []  # Cannot execute
  L1: [read_repo, propose_diff]
  L2: [read_repo, write_files_in_worktree, run_tests]
  L3: [read_repo, write_files_in_worktree, run_tests, commit_to_branch]
```

**`enforce_perms()` logic**:
1. Get current autonomy level from MIND engine
2. Look up agent's permission set for that level
3. Validate requested tool against allowlist
4. Block with reason if not permitted

---

### Phase 7: Testing

**Goal**: Add automated test suite

**Location**: `*.spec.ts` files alongside implementations

**Test categories**:
- Schema validation - All artifact schemas with valid/invalid fixtures
- CSS calculation - Weighted scoring, staleness decay
- Autonomy resolution - All State × CSS matrix cells
- Permission enforcement - Each agent at each autonomy level
- Worktree operations - Creation, isolation, cleanup

---

## Critical Path

```
Phase 1: Artifact Schemas (libs/context-schema)
    ↓
Phase 2: BASIS Engine (engines/basis)
    ↓
Phase 3: MIND Engine (engines/mind)
    ↓
Phase 4: Agent Runners (polymath first)
    ↓
Phase 5: Extend MCP Runtime
    ↓
Phase 6: Permission Matrix
    ↓
Phase 7: Testing
```

---

## Files to Modify

| Existing File | Changes |
|---------------|---------|
| `libs/context-schema/src/index.ts` | Export new artifact schemas |
| `apps/mcp-runtime/slate-runtime/server.ts` | Add 7 new RPC methods |
| `nx.json` | Register new engine/agent projects |
| `tsconfig.base.json` | Add path mappings for new packages |

## Files to Create

| New File | Purpose |
|----------|---------|
| `libs/context-schema/src/artifacts/*.ts` | 7 artifact schema files |
| `engines/basis/src/*.ts` | 5 BASIS engine modules |
| `engines/mind/src/*.ts` | 5 MIND engine modules |
| `agents/polymath/src/*.ts` | Polymath runner |
| `agents/executor/src/*.ts` | Executor runner + worktree |
| `agents/horizon/src/*.ts` | Horizon runner + gates |

---

## Verification

After implementation:

1. **Schema validation**:
   ```bash
   nx test context-schema
   ```

2. **Engine tests**:
   ```bash
   nx test basis
   nx test mind
   ```

3. **End-to-end flow**:
   - Submit task via `slate.route_task`
   - Polymath produces TaskMap artifact
   - Executor produces PatchSet in worktree
   - Horizon produces ShipDecision
   - Verify permission matrix blocks Polymath from writing

4. **CSS affects autonomy**:
   - Low CSS (< 30) → L0 for all states
   - High CSS (90+) + fresh_session → L3

---

## Source Specifications

| Spec | Location | Key Content |
|------|----------|-------------|
| Primary architecture | [slate_architecture.md](https://github.com/jaredlandt/Mind_Matter/blob/main/docs/slate_architecture.md) | Agent specs, artifact schemas, permission matrix |
| BASIS engine | [cntxt-wiz.md](https://github.com/jaredlandt/Mind_Matter/blob/main/engines/cntxt-wiz.md) | Ten Questions, Frame Discovery, CSS |
| MIND engine | [cgntn-wiz.md](https://github.com/jaredlandt/Mind_Matter/blob/main/engines/cgntn-wiz.md) | Operator states, autonomy, capacity rules |
| OCP protocol | [operator-context-protocol.md](https://github.com/jaredlandt/Mind_Matter/blob/main/protocol/operator-context-protocol.md) | Message types, State×CSS matrix |
| Glossary | [glossary.md](https://github.com/jaredlandt/Mind_Matter/blob/main/docs/glossary.md) | Shared vocabulary |
