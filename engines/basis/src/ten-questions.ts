/**
 * Ten Questions Framework
 *
 * The Ten Questions provide a systematic approach to context extraction,
 * grounded in semiotics, communication theory, frame analysis, and deixis.
 *
 * Critical questions (weighted 2.0x in CSS): Q1, Q2, Q4, Q9
 * Important questions (weighted 1.0x): Q3, Q6, Q7, Q10
 * Nice-to-have (weighted 0.5x): Q5, Q8
 */

// Re-export types from context-schema
export {
  type Actors,
  type Motivation,
  type Constraints,
  type Bounds,
  type Semiotics,
  type Temporality,
  type Location,
  type Environment,
  type Frame,
  type Anchors,
  type TenQuestions,
  TenQuestionsSchema,
  ActorsSchema,
  MotivationSchema,
  ConstraintsSchema,
  BoundsSchema,
  SemioticsSchema,
  TemporalitySchema,
  LocationSchema,
  EnvironmentSchema,
  FrameSchema,
  AnchorsSchema
} from "@slate/context-schema";

/**
 * Question weights for CSS calculation
 */
export const QUESTION_WEIGHTS = {
  q1_actors: 2.0,      // Critical - who is involved
  q2_motivation: 2.0,  // Critical - why are we here
  q3_constraints: 1.0, // Important - what limits us
  q4_bounds: 2.0,      // Critical - deadlines, SLAs
  q5_semiotics: 0.5,   // Nice-to-have - codes and meaning
  q6_temporality: 1.0, // Important - timing
  q7_location: 1.0,    // Important - where
  q8_environment: 0.5, // Nice-to-have - surroundings
  q9_frame: 2.0,       // Critical - perspective
  q10_anchors: 1.0     // Important - reference points
} as const;

export type QuestionKey = keyof typeof QUESTION_WEIGHTS;

/**
 * Calculate weighted confidence score from Ten Questions
 */
export function calculateWeightedConfidence(questions: Record<QuestionKey, { confidence: number }>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(QUESTION_WEIGHTS)) {
    const question = questions[key as QuestionKey];
    if (question?.confidence !== undefined) {
      weightedSum += question.confidence * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Get critical questions (weighted 2.0x)
 */
export const CRITICAL_QUESTIONS: QuestionKey[] = ["q1_actors", "q2_motivation", "q4_bounds", "q9_frame"];

/**
 * Get important questions (weighted 1.0x)
 */
export const IMPORTANT_QUESTIONS: QuestionKey[] = ["q3_constraints", "q6_temporality", "q7_location", "q10_anchors"];

/**
 * Get nice-to-have questions (weighted 0.5x)
 */
export const NICE_TO_HAVE_QUESTIONS: QuestionKey[] = ["q5_semiotics", "q8_environment"];
