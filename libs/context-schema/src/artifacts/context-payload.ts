import { z } from "zod";

/**
 * ContextPayload - BASIS engine output
 * Purpose: Living source-of-truth record with Ten Questions
 */

// Ten Questions dimension schemas

export const ActorsSchema = z.object({
  humans: z.array(z.string()).optional(),
  systems: z.array(z.string()).optional(),
  vendors: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1)
});

export const MotivationSchema = z.object({
  stated_goal: z.string().optional(),
  underlying_need: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const ConstraintsSchema = z.object({
  technical: z.array(z.string()).optional(),
  policy: z.array(z.string()).optional(),
  resource: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1)
});

export const BoundsSchema = z.object({
  deadline: z.string().optional(),
  sla: z.string().optional(),
  window: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const SemioticsSchema = z.object({
  codes_used: z.array(z.string()).optional(),
  interpretations: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1)
});

export const TemporalitySchema = z.object({
  when_started: z.string().optional(),
  pattern: z.string().optional(),
  frequency: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const LocationSchema = z.object({
  physical: z.string().optional(),
  logical: z.string().optional(),
  organizational: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const EnvironmentSchema = z.object({
  parent_system: z.string().optional(),
  adjacent_systems: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1)
});

export const FrameSchema = z.object({
  perspective: z.string().optional(),
  mental_model: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const AnchorsSchema = z.object({
  baseline: z.string().optional(),
  reference_point: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const TenQuestionsSchema = z.object({
  q1_actors: ActorsSchema,
  q2_motivation: MotivationSchema,
  q3_constraints: ConstraintsSchema,
  q4_bounds: BoundsSchema,
  q5_semiotics: SemioticsSchema,
  q6_temporality: TemporalitySchema,
  q7_location: LocationSchema,
  q8_environment: EnvironmentSchema,
  q9_frame: FrameSchema,
  q10_anchors: AnchorsSchema
});

export const DecisionOptionSchema = z.object({
  id: z.string(),
  description: z.string(),
  score: z.number().optional()
});

export const DecisionMatrixSchema = z.object({
  options: z.array(DecisionOptionSchema),
  constraints: z.array(z.string()),
  recommendation: z.object({
    option: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
    rationale: z.string()
  }).optional()
});

export const ContextPayloadMetadataSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  staleness_decay: z.number().min(0).max(1)
});

export const ContextPayloadSchema = z.object({
  id: z.string(),
  version: z.number(),
  confidence_score: z.number().min(0).max(1),
  questions: TenQuestionsSchema,
  decision_matrix: DecisionMatrixSchema.optional(),
  metadata: ContextPayloadMetadataSchema
});

export type Actors = z.infer<typeof ActorsSchema>;
export type Motivation = z.infer<typeof MotivationSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type Bounds = z.infer<typeof BoundsSchema>;
export type Semiotics = z.infer<typeof SemioticsSchema>;
export type Temporality = z.infer<typeof TemporalitySchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type Frame = z.infer<typeof FrameSchema>;
export type Anchors = z.infer<typeof AnchorsSchema>;
export type TenQuestions = z.infer<typeof TenQuestionsSchema>;
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;
export type DecisionMatrix = z.infer<typeof DecisionMatrixSchema>;
export type ContextPayloadMetadata = z.infer<typeof ContextPayloadMetadataSchema>;
export type ContextPayload = z.infer<typeof ContextPayloadSchema>;
