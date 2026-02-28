# Agent Runner Implementation Guide

How to implement agent runners in SLATE.

## Overview

Each agent in SLATE follows a consistent runner pattern with:
- Permission validation
- LLM-based processing (where applicable)
- Artifact production with schema validation
- Structured error handling

## Directory Structure

```
agents/{agent-name}/
├── src/
│   ├── runner.ts       # Main runner implementation
│   ├── permissions.ts  # Permission helpers
│   └── index.ts        # Re-exports
├── project.json        # Nx build config
├── tsconfig.json       # TypeScript config
└── tsconfig.lib.json   # Library build config
```

## Runner Pattern

### Basic Structure

```typescript
import {
  ArtifactSchema,
  type ArtifactType,
  PermissionDeniedError,
  ValidationError,
  LLMError,
  wrapError
} from "@slate/context-schema";
import { type AutonomyLevel, validatePermissions, type Permission } from "./permissions.js";

const AGENT_ID = "agent-name" as const;

export interface AgentInput {
  // Input from previous agent
}

export interface AgentOutput {
  success: boolean;
  artifact?: ArtifactType;
  errors?: string[];
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
}
```

### Permission Guard

```typescript
function createPermissionGuard(level: AutonomyLevel) {
  return (permission: Permission) => {
    const check = validatePermissions(level, [permission]);
    if (!check.valid) {
      throw new PermissionDeniedError(permission, level, AGENT_ID);
    }
  };
}
```

### Run Function

```typescript
export async function run(
  input: AgentInput,
  config: RunnerConfig
): Promise<AgentOutput> {
  const requirePermission = createPermissionGuard(config.autonomyLevel);

  try {
    // Check required permissions
    requirePermission("read_repo");

    // Process with LLM or other logic
    const artifact = await processInput(input, config);

    // Validate output
    const validation = ArtifactSchema.safeParse(artifact);
    if (!validation.success) {
      throw new ValidationError(
        "ArtifactType",
        validation.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
        AGENT_ID
      );
    }

    return {
      success: true,
      artifact: validation.data
    };
  } catch (error) {
    const wrappedError = wrapError(error, AGENT_ID);
    return {
      success: false,
      errors: [wrappedError.message]
    };
  }
}
```

## Adding LLM Calls

### Using OpenAI Chat Completions

```typescript
import OpenAI from "openai";

function createClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new LLMError(
      "OPENAI_API_KEY environment variable is required",
      AGENT_ID,
      undefined,
      false
    );
  }
  return new OpenAI({ apiKey: key });
}

async function callLLM(
  client: OpenAI,
  prompt: string,
  systemPrompt: string,
  maxTokens = 2048,
  model = "gpt-4o-mini"
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    });

    const message = response.choices[0]?.message?.content ?? "";
    if (!message) {
      throw new LLMError("No text response from LLM", AGENT_ID);
    }
    return Array.isArray(message)
      ? message.map((part) => (typeof part === "string" ? part : part.text ?? "")).join("")
      : message;
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw new LLMError(
      error instanceof Error ? error.message : String(error),
      AGENT_ID,
      undefined,
      true,
      error instanceof Error ? error : undefined
    );
  }
}
```

### Parsing JSON Responses

```typescript
function parseJsonResponse<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new LLMError("No JSON found in LLM response", AGENT_ID);
  }
  return JSON.parse(jsonMatch[0]) as T;
}
```

## Testing Agents

### Unit Tests

Create `*.spec.ts` files alongside your implementation:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { run } from './runner.js';

describe('AgentName', () => {
  it('should produce valid artifact', async () => {
    const input = { /* mock input */ };
    const config = { autonomyLevel: 'L2' as const };

    const result = await run(input, config);

    expect(result.success).toBe(true);
    expect(result.artifact).toBeDefined();
  });

  it('should fail with insufficient permissions', async () => {
    const input = { /* mock input */ };
    const config = { autonomyLevel: 'L0' as const };

    const result = await run(input, config);

    expect(result.success).toBe(false);
  });
});
```

### Mocking LLM Calls

```typescript
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"valid": "json"}' }]
      })
    }
  }))
}));
```

## Debugging

### Enable Logging

Add structured logs throughout your runner:

```typescript
import { appendLog } from './logs.js';

appendLog({
  level: "info",
  category: "agent",
  message: `${AGENT_ID}: starting execution`,
  data: { autonomyLevel: config.autonomyLevel }
});
```

### Error Information

All errors include:
- `agentId`: Which agent failed
- `phase`: When it failed (init/execute/validate)
- `recoverable`: Whether retry might succeed
- `cause`: Original error if wrapped

## Reference Implementations

- **Polymath** (`/agents/polymath/`): LLM-based exploration, read-only
- **Executor** (`/agents/executor/`): Command execution, worktree writes
- **Horizon** (`/agents/horizon/`): Verification and gating
