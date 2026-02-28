/**
 * Context Payload Builder
 *
 * Builds and manages ContextPayload artifacts for the BASIS engine.
 */

import {
  type ContextPayload,
  type TenQuestions,
  type DecisionMatrix,
  ContextPayloadSchema
} from "@slate/context-schema";
import { calculateWeightedConfidence, QuestionKey } from "./ten-questions.js";

/**
 * Options for creating a new Context Payload
 */
export interface CreatePayloadOptions {
  id?: string;
  questions?: Partial<TenQuestions>;
  decisionMatrix?: DecisionMatrix;
}

/**
 * Default empty question with 0 confidence
 */
function emptyQuestion(): { confidence: number } {
  return { confidence: 0 };
}

/**
 * Generate a unique payload ID
 */
function generatePayloadId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `cp-${date}-${random}`;
}

/**
 * Create a new Context Payload with defaults
 */
export function createContextPayload(options: CreatePayloadOptions = {}): ContextPayload {
  const now = new Date().toISOString();

  const questions: TenQuestions = {
    q1_actors: { confidence: 0, ...options.questions?.q1_actors },
    q2_motivation: { confidence: 0, ...options.questions?.q2_motivation },
    q3_constraints: { confidence: 0, ...options.questions?.q3_constraints },
    q4_bounds: { confidence: 0, ...options.questions?.q4_bounds },
    q5_semiotics: { confidence: 0, ...options.questions?.q5_semiotics },
    q6_temporality: { confidence: 0, ...options.questions?.q6_temporality },
    q7_location: { confidence: 0, ...options.questions?.q7_location },
    q8_environment: { confidence: 0, ...options.questions?.q8_environment },
    q9_frame: { confidence: 0, ...options.questions?.q9_frame },
    q10_anchors: { confidence: 0, ...options.questions?.q10_anchors }
  };

  const confidenceScore = calculateWeightedConfidence(
    questions as Record<QuestionKey, { confidence: number }>
  );

  return {
    id: options.id ?? generatePayloadId(),
    version: 1,
    confidence_score: confidenceScore,
    questions,
    decision_matrix: options.decisionMatrix,
    metadata: {
      created_at: now,
      updated_at: now,
      staleness_decay: 0.5 // default: 50% decay per 24h
    }
  };
}

/**
 * Update a Context Payload with new data
 */
export function updateContextPayload(
  payload: ContextPayload,
  updates: {
    questions?: Partial<TenQuestions>;
    decisionMatrix?: DecisionMatrix;
  }
): ContextPayload {
  const now = new Date().toISOString();

  const updatedQuestions: TenQuestions = {
    ...payload.questions,
    ...updates.questions
  };

  const confidenceScore = calculateWeightedConfidence(
    updatedQuestions as Record<QuestionKey, { confidence: number }>
  );

  return {
    ...payload,
    version: payload.version + 1,
    confidence_score: confidenceScore,
    questions: updatedQuestions,
    decision_matrix: updates.decisionMatrix ?? payload.decision_matrix,
    metadata: {
      ...payload.metadata,
      updated_at: now
    }
  };
}

/**
 * Calculate current freshness based on staleness decay
 */
export function calculateFreshness(payload: ContextPayload): number {
  const updatedAt = new Date(payload.metadata.updated_at).getTime();
  const now = Date.now();
  const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);
  const daysSinceUpdate = hoursSinceUpdate / 24;

  // Exponential decay: freshness = 1 * (decay_rate ^ days)
  // With decay_rate = 0.5, after 1 day: 0.5, after 2 days: 0.25
  const decayRate = payload.metadata.staleness_decay;
  const freshness = Math.pow(decayRate, daysSinceUpdate);

  return Math.max(0, Math.min(1, freshness));
}

/**
 * Get effective confidence score (base confidence * freshness)
 */
export function getEffectiveConfidence(payload: ContextPayload): number {
  const freshness = calculateFreshness(payload);
  return payload.confidence_score * freshness;
}

/**
 * Validate a Context Payload against the schema
 */
export function validateContextPayload(payload: unknown): {
  valid: boolean;
  errors?: string[];
  data?: ContextPayload;
} {
  const result = ContextPayloadSchema.safeParse(payload);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}
