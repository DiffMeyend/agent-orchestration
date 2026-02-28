# Error Handling

Error types, recovery strategies, and debugging in SLATE.

## Error Hierarchy

```
Error
  └── AgentError (base class)
        ├── PermissionDeniedError
        ├── ValidationError
        ├── LLMError
        ├── WorktreeError
        └── OrchestrationError
```

## Error Classes

### AgentError (Base)

```typescript
class AgentError extends Error {
  constructor(
    message: string,
    agentId: AgentId,
    phase: "init" | "execute" | "validate",
    recoverable: boolean,
    cause?: Error
  )
}
```

Properties:
- `agentId`: Which agent threw the error
- `phase`: When in the agent lifecycle it occurred
- `recoverable`: Whether retry might succeed
- `cause`: Original error if wrapped

### PermissionDeniedError

Thrown when an agent attempts an unauthorized action.

```typescript
new PermissionDeniedError(
  "write_files_in_worktree",  // permission
  "L1",                        // autonomyLevel
  "executor"                   // agentId
)
```

**Not recoverable** without changing autonomy level.

### ValidationError

Thrown when an artifact fails schema validation.

```typescript
new ValidationError(
  "TaskMap",                                    // artifactType
  ["missing required field: goal"],             // validationErrors
  "polymath"                                    // agentId
)
```

**Recoverable** - retry with corrected output.

### LLMError

Thrown when LLM API calls fail.

```typescript
new LLMError(
  "Rate limit exceeded",  // message
  "polymath",             // agentId
  429,                    // statusCode (optional)
  true,                   // retryable
  originalError           // cause (optional)
)
```

**Recoverable** if `retryable: true`.

### WorktreeError

Thrown when git worktree operations fail.

```typescript
new WorktreeError(
  "Failed to create worktree",  // message
  "executor",                    // agentId
  "wt-123",                      // worktreeId (optional)
  "create",                      // operation: create|cleanup|read|write
  originalError                  // cause (optional)
)
```

**Recoverable** depends on operation (create failures typically not).

### OrchestrationError

Thrown when pipeline orchestration fails.

```typescript
new OrchestrationError(
  "Pipeline step failed",       // message
  "polymath",                   // agentId
  "session-123",                // sessionId (optional)
  "polymath",                   // pipelineStep (optional)
  originalError                 // cause (optional)
)
```

**Recoverable** - often can retry from failed step.

## Error Handling Pattern

```typescript
export async function run(input: Input, config: Config): Promise<Output> {
  try {
    // Check permissions
    requirePermission("read_repo");

    // Execute logic
    const result = await doWork(input);

    // Validate output
    const validation = Schema.safeParse(result);
    if (!validation.success) {
      throw new ValidationError("Type", validation.error.errors.map(e => e.message), AGENT_ID);
    }

    return { success: true, artifact: validation.data };
  } catch (error) {
    const wrappedError = wrapError(error, AGENT_ID);
    return { success: false, errors: [wrappedError.message] };
  }
}
```

## Utility Functions

### wrapError

Wraps any error in an AgentError for consistent handling:

```typescript
const wrappedError = wrapError(unknownError, "polymath");
// Returns existing AgentError unchanged, or wraps in new AgentError
```

### isAgentError

Type guard for AgentError:

```typescript
if (isAgentError(error)) {
  console.log(error.agentId, error.phase, error.recoverable);
}
```

### isRecoverableError

Check if an error is recoverable:

```typescript
if (isRecoverableError(error)) {
  // Retry logic
}
```

## Recovery Strategies

### By Error Type

| Error Type | Strategy |
|------------|----------|
| PermissionDeniedError | Escalate to higher autonomy level or abort |
| ValidationError | Retry with modified input/prompt |
| LLMError (retryable) | Exponential backoff retry |
| LLMError (not retryable) | Abort or use fallback |
| WorktreeError (create) | Abort - cannot proceed without worktree |
| WorktreeError (other) | Retry or cleanup and restart |
| OrchestrationError | Retry from failed step |

### Session-Level Recovery

```typescript
try {
  await runPipeline(session);
} catch (error) {
  if (isRecoverableError(error)) {
    // Log and retry from current step
    session.fail(error.message);
    // Artifacts from completed steps are preserved
  } else {
    // Non-recoverable - abort session
    session.fail(error.message);
    throw error;
  }
}
```

## JSON Serialization

All errors support JSON serialization for logging and transport:

```typescript
const error = new PermissionDeniedError("write", "L1", "executor");
const json = error.toJSON();
// {
//   name: "PermissionDeniedError",
//   message: "Permission \"write\" denied for agent executor at L1",
//   agentId: "executor",
//   phase: "execute",
//   recoverable: false,
//   permission: "write",
//   autonomyLevel: "L1"
// }
```

## Debugging

### Enable Verbose Logging

```typescript
appendLog({
  level: "debug",
  category: "error",
  message: "Agent error occurred",
  data: error.toJSON()
});
```

### Error Context

Always include:
- Which agent failed
- What operation was attempted
- Input parameters (sanitized)
- Autonomy level
- Session ID (if applicable)

### Stack Traces

AgentError maintains proper stack traces:

```typescript
const error = new AgentError("Test", "polymath", "execute", true);
console.log(error.stack);
// AgentError: Test
//     at run (/agents/polymath/src/runner.ts:123:11)
//     at ...
```

## Best Practices

1. **Always wrap unknown errors** using `wrapError()`
2. **Use specific error classes** for actionable failures
3. **Check recoverability** before retry
4. **Preserve error context** through wrapping
5. **Log errors with full context** for debugging
6. **Serialize errors** for remote debugging
