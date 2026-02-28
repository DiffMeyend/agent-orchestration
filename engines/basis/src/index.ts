/**
 * BASIS Engine - Behavioral Agent State Iteration System
 *
 * Purpose: Assemble context so judgment is sound.
 *
 * Core Components:
 * - CSS Calculator: Compute Context Stability Score
 * - Ten Questions: Framework for systematic context extraction
 * - Context Payload Builder: Create and manage context payloads
 */

// CSS Calculator
export {
  CSSCalculator,
  type CSSConfig,
  type CSSResult,
  type DomainScore,
  type RuntimeMode,
  type CSSRule,
  type ConditionGroup,
  type HardCap
} from "./css-calculator.js";

// Ten Questions Framework
export {
  QUESTION_WEIGHTS,
  CRITICAL_QUESTIONS,
  IMPORTANT_QUESTIONS,
  NICE_TO_HAVE_QUESTIONS,
  calculateWeightedConfidence,
  type QuestionKey
} from "./ten-questions.js";

// Context Payload Builder
export {
  createContextPayload,
  updateContextPayload,
  calculateFreshness,
  getEffectiveConfidence,
  validateContextPayload,
  type CreatePayloadOptions
} from "./context-payload-builder.js";

// Re-export schema types for convenience
export {
  type ContextPayload,
  type TenQuestions,
  type DecisionMatrix,
  ContextPayloadSchema
} from "@slate/context-schema";
