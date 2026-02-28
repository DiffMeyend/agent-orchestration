# Permission Model

End-to-end permission flow in SLATE.

## Overview

SLATE uses a matrix-based permission system where:
- Each agent has a defined set of capabilities
- Permissions are granted based on autonomy level (L0-L3)
- Higher autonomy = more permissions

## Permission Types

| Permission | Description |
|------------|-------------|
| `read_repo` | Read files from the repository |
| `search_docs` | Search documentation and external sources |
| `run_readonly_checks` | Run static analysis without side effects |
| `run_tests_readonly` | View test results without running |
| `write_specs_only` | Write specification documents |
| `write_briefs` | Write brief/summary documents |
| `write_files_in_worktree` | Write code in isolated worktree |
| `run_tests` | Execute test suites |
| `commit_to_branch` | Commit changes to worktree branch |
| `propose_diff` | Generate diff without applying |
| `diff_view` | View diffs and changes |
| `run_verification_tests` | Run verification test suites |
| `approve_merge` | Approve worktree merge to main |

## Autonomy Levels

| Level | Name | Description |
|-------|------|-------------|
| L0 | Observe | Minimal permissions, read-only where possible |
| L1 | Propose | Can propose changes, cannot execute |
| L2 | Checkpoint | Can execute with verification checkpoints |
| L3 | Gated Auto | Autonomous with final approval gates |

## Permission Matrix

### Read-Only Agents (Polymath, Resonant, Architect, Alchemist)

| Level | Permissions |
|-------|-------------|
| L0 | `read_repo`, `search_docs` |
| L1 | `read_repo`, `search_docs` |
| L2 | `read_repo`, `search_docs` |
| L3 | `read_repo`, `search_docs` |

### Executor (Write Agent)

| Level | Permissions |
|-------|-------------|
| L0 | (none - cannot execute) |
| L1 | `read_repo`, `propose_diff` |
| L2 | `read_repo`, `write_files_in_worktree`, `run_tests` |
| L3 | `read_repo`, `write_files_in_worktree`, `run_tests`, `commit_to_branch` |

### Horizon (Verification Agent)

| Level | Permissions |
|-------|-------------|
| L0 | `read_repo`, `diff_view` |
| L1 | `read_repo`, `diff_view`, `run_verification_tests` |
| L2 | `read_repo`, `diff_view`, `run_verification_tests` |
| L3 | `read_repo`, `diff_view`, `run_verification_tests`, `approve_merge` |

## Enforcement Flow

```
Agent requests action
        ↓
createPermissionGuard(autonomyLevel)
        ↓
validatePermissions(level, [permission])
        ↓
    ┌───┴───┐
    │allowed│ → proceed
    └───┬───┘
        │
    denied → throw PermissionDeniedError
```

## Implementation

### Permission Types (`/libs/context-schema/src/permissions/permission-types.ts`)

```typescript
export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

export type Permission =
  | "read_repo"
  | "search_docs"
  | "write_files_in_worktree"
  | "run_tests"
  // ... etc
```

### Permission Matrix (`/libs/context-schema/src/permissions/permission-matrix.ts`)

```typescript
export const PERMISSION_MATRIX: Record<AgentId, Record<AutonomyLevel, Permission[]>> = {
  executor: {
    L0: [],
    L1: ["read_repo", "propose_diff"],
    L2: ["read_repo", "write_files_in_worktree", "run_tests"],
    L3: ["read_repo", "write_files_in_worktree", "run_tests", "commit_to_branch"]
  }
  // ... etc
};
```

### Validation Functions

```typescript
// Check if permission is allowed
function hasPermission(agent: AgentId, level: AutonomyLevel, permission: Permission): boolean

// Get all permissions for agent at level
function getPermissions(agent: AgentId, level: AutonomyLevel): Permission[]

// Validate requested permissions
function validatePermissions(agent: AgentId, level: AutonomyLevel, requested: Permission[]): PermissionValidationResult
```

## MCP Enforcement

The MCP server provides `slate.enforce_perms` for runtime checking:

```json
{
  "method": "slate.enforce_perms",
  "params": {
    "agent": "executor",
    "autonomy_level": "L1",
    "permission": "write_files_in_worktree"
  }
}
```

Response:
```json
{
  "allowed": false,
  "reason": "Permission \"write_files_in_worktree\" denied for agent executor at L1"
}
```

## Error Handling

```typescript
class PermissionDeniedError extends AgentError {
  constructor(
    permission: string,
    autonomyLevel: string,
    agentId: AgentId
  )
}
```

Permission errors are:
- **Not recoverable** without changing autonomy level
- Logged for audit purposes
- Include full context (agent, level, permission)

## Autonomy Level Resolution

Autonomy level is determined by the State × CSS Matrix:

```
           CSS<30   CSS 30-59   CSS 60-89   CSS 90+
fresh        L0        L1          L2         L3
mid          L0        L1          L2         L2
faded        L0        L0          L1         L1
high_p       L0        L1          L1         L2
```

See `engines/mind/src/autonomy-resolver.ts` for implementation.
