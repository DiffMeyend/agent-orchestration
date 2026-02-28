# Worktree Workflow Guide

Step-by-step guide for Executor's isolated git worktree workflow.

## Overview

The Executor agent writes code only in isolated git worktrees. This ensures:
- Main branch is never directly modified
- Changes can be reviewed before merging
- Failed implementations can be discarded cleanly

## Lifecycle

```
Create Worktree → Execute Commands → Run Tests → Capture Diff → Review → Merge/Reject → Cleanup
```

## MCP Methods

### 1. Create Worktree

```json
{
  "method": "slate.create_worktree",
  "params": {
    "task_id": "optional-task-reference"
  }
}
```

Response:
```json
{
  "id": "wt-2026-02-08-abc123",
  "path": "/path/to/.worktrees/wt-2026-02-08-abc123",
  "branch": "slate/wt-2026-02-08-abc123",
  "status": "active",
  "created_at": "2026-02-08T12:00:00Z"
}
```

### 2. Get Worktree Info

```json
{
  "method": "slate.get_worktree",
  "params": {
    "worktree_id": "wt-2026-02-08-abc123"
  }
}
```

### 3. List All Worktrees

```json
{
  "method": "slate.list_worktrees"
}
```

### 4. Gate Merge (Requires ShipDecision)

```json
{
  "method": "slate.gate_merge",
  "params": {
    "worktree_id": "wt-2026-02-08-abc123",
    "ship_decision_id": "sd-2026-02-08-xyz789"
  }
}
```

### 5. Cleanup Worktree

```json
{
  "method": "slate.cleanup_worktree",
  "params": {
    "worktree_id": "wt-2026-02-08-abc123"
  }
}
```

## Executor Integration

### Path Validation

Before any file operation, verify the path is within the worktree:

```typescript
function isPathInWorktree(filePath: string, worktreePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedWorktree = worktreePath.replace(/\\/g, "/");
  return normalizedPath.startsWith(normalizedWorktree);
}
```

### Command Execution

All commands run with `cwd` set to the worktree path:

```typescript
const result = captureCommand(command, {
  cwd: worktreePath,
  timeout: 60000
});
```

### Capturing Git Diff

```typescript
function captureGitDiff(worktreePath: string): string {
  const result = captureCommand("git diff HEAD", { cwd: worktreePath });
  return result.stdout || "";
}

function getChangedFiles(worktreePath: string): string[] {
  const result = captureCommand("git diff --name-only HEAD", { cwd: worktreePath });
  return (result.stdout || "").split("\n").filter(Boolean);
}
```

## Permission Requirements

| Autonomy Level | Allowed Operations |
|----------------|-------------------|
| L0 | None (Executor cannot run) |
| L1 | `read_repo`, `propose_diff` (view only) |
| L2 | `write_files_in_worktree`, `run_tests` |
| L3 | All L2 + `commit_to_branch` |

## Merge Flow

1. **Executor** produces `PatchSet` with diff and test results
2. **Horizon** evaluates and produces `ShipDecision`
3. If decision is "ship", call `slate.gate_merge` with both IDs
4. Gate verifies ShipDecision is "ship" before allowing merge
5. Worktree marked as merged
6. Cleanup removes worktree directory and branch

## Error Handling

```typescript
try {
  const result = captureCommand(cmd, { cwd: worktreePath });
} catch (error) {
  throw new WorktreeError(
    `Command failed: ${cmd}`,
    "executor",
    worktreeId,
    "write",
    error instanceof Error ? error : undefined
  );
}
```

## Worktree States

| State | Description |
|-------|-------------|
| `active` | In use, accepting changes |
| `merged` | Successfully merged to target branch |
| `rejected` | Changes rejected, pending cleanup |
| `cleaned` | Removed from filesystem |

## Best Practices

1. **Always validate paths** before file operations
2. **Run tests** before creating PatchSet
3. **Capture comprehensive diffs** including unstaged changes
4. **Clean up promptly** after merge or rejection
5. **Log operations** for debugging
