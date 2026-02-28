/**
 * Errors Module
 *
 * Structured error types for SLATE agent failures.
 */

export {
  AgentError,
  PermissionDeniedError,
  ValidationError,
  LLMError,
  WorktreeError,
  OrchestrationError,
  wrapError,
  isAgentError,
  isRecoverableError,
  type ErrorPhase
} from "./agent-error.js";
