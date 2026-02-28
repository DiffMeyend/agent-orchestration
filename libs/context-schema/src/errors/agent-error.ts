/**
 * Agent Error Classes
 *
 * Structured error hierarchy for SLATE agent failures.
 * Enables consistent error handling, propagation, and recovery.
 */

import type { AgentId } from "../permissions/permission-types.js";

export type ErrorPhase = "init" | "execute" | "validate";

/**
 * Base error class for all agent-related failures.
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentId: AgentId,
    public readonly phase: ErrorPhase,
    public readonly recoverable: boolean,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "AgentError";

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a JSON-serializable representation for logging/transport
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      agentId: this.agentId,
      phase: this.phase,
      recoverable: this.recoverable,
      cause: this.cause?.message,
      stack: this.stack
    };
  }
}

/**
 * Thrown when an agent attempts an action without required permission.
 */
export class PermissionDeniedError extends AgentError {
  constructor(
    public readonly permission: string,
    public readonly autonomyLevel: string,
    agentId: AgentId,
    phase: ErrorPhase = "execute"
  ) {
    super(
      `Permission "${permission}" denied for agent ${agentId} at autonomy level ${autonomyLevel}`,
      agentId,
      phase,
      false // Permission errors are not recoverable without level change
    );
    this.name = "PermissionDeniedError";
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      permission: this.permission,
      autonomyLevel: this.autonomyLevel
    };
  }
}

/**
 * Thrown when an artifact fails schema validation.
 */
export class ValidationError extends AgentError {
  constructor(
    public readonly artifactType: string,
    public readonly validationErrors: string[],
    agentId: AgentId
  ) {
    super(
      `Validation failed for ${artifactType}: ${validationErrors.join("; ")}`,
      agentId,
      "validate",
      true // Validation errors may be recoverable with retry
    );
    this.name = "ValidationError";
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      artifactType: this.artifactType,
      validationErrors: this.validationErrors
    };
  }
}

/**
 * Thrown when an LLM API call fails or returns invalid response.
 */
export class LLMError extends AgentError {
  constructor(
    message: string,
    agentId: AgentId,
    public readonly statusCode?: number,
    public readonly retryable: boolean = true,
    cause?: Error
  ) {
    super(
      message,
      agentId,
      "execute",
      retryable,
      cause
    );
    this.name = "LLMError";
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      retryable: this.retryable
    };
  }
}

/**
 * Thrown when a git worktree operation fails.
 */
export class WorktreeError extends AgentError {
  constructor(
    message: string,
    agentId: AgentId,
    public readonly worktreeId?: string,
    public readonly operation: "create" | "cleanup" | "read" | "write" = "read",
    cause?: Error
  ) {
    super(
      message,
      agentId,
      "execute",
      operation !== "create", // Create failures are typically not recoverable
      cause
    );
    this.name = "WorktreeError";
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      worktreeId: this.worktreeId,
      operation: this.operation
    };
  }
}

/**
 * Thrown when pipeline orchestration fails.
 */
export class OrchestrationError extends AgentError {
  constructor(
    message: string,
    agentId: AgentId,
    public readonly sessionId?: string,
    public readonly pipelineStep?: string,
    cause?: Error
  ) {
    super(
      message,
      agentId,
      "execute",
      true, // Orchestration errors often recoverable with retry
      cause
    );
    this.name = "OrchestrationError";
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      sessionId: this.sessionId,
      pipelineStep: this.pipelineStep
    };
  }
}

/**
 * Wrap any error in an AgentError for consistent handling.
 */
export function wrapError(
  error: unknown,
  agentId: AgentId,
  phase: ErrorPhase = "execute"
): AgentError {
  if (error instanceof AgentError) {
    return error;
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  return new AgentError(
    cause.message,
    agentId,
    phase,
    true,
    cause
  );
}

/**
 * Type guard to check if an error is an AgentError.
 */
export function isAgentError(error: unknown): error is AgentError {
  return error instanceof AgentError;
}

/**
 * Type guard to check if an error is recoverable.
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AgentError) {
    return error.recoverable;
  }
  return true; // Unknown errors assumed recoverable
}
