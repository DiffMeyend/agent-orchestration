/**
 * Resonant Agent Runner
 *
 * Purpose: Research and alignment. Produces EvidencePack artifacts.
 * Permissions: Read-only at all autonomy levels.
 */

import {
  EvidencePackSchema,
  type EvidencePack,
  type TaskMap,
  type ContextPayload,
  type Fact,
  type Risk,
  type Constraint,
  type ValuesAlignment,
  PermissionDeniedError,
  ValidationError,
  wrapError
} from "@slate/context-schema";
import {
  type AutonomyLevel,
  type Permission,
  validatePermissions
} from "./permissions.js";

const AGENT_ID = "resonant" as const;

export interface ResonantInput {
  taskMap: TaskMap;
  context: ContextPayload;
}

export interface ResonantOutput {
  success: boolean;
  artifact?: EvidencePack;
  errors?: string[];
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
}

const QUESTION_LABELS: Record<keyof ContextPayload["questions"], string> = {
  q1_actors: "Actors",
  q2_motivation: "Motivation",
  q3_constraints: "Constraints",
  q4_bounds: "Bounds",
  q5_semiotics: "Semiotics",
  q6_temporality: "Temporality",
  q7_location: "Location",
  q8_environment: "Environment",
  q9_frame: "Frame",
  q10_anchors: "Anchors"
};

function generateEvidencePackId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `ep-${date}-${random}`;
}

/**
 * Translate context payload into structured facts
 */
export function validateFacts(taskMap: TaskMap, context: ContextPayload): Fact[] {
  const facts: Fact[] = [];

  for (const [questionKey, payload] of Object.entries(context.questions)) {
    const label =
      QUESTION_LABELS[questionKey as keyof ContextPayload["questions"]] ?? questionKey;
    const detail = payload as Record<string, unknown>;
    const confidence =
      typeof detail.confidence === "number" ? detail.confidence : context.confidence_score;

    for (const [key, value] of Object.entries(detail)) {
      if (key === "confidence") continue;
      if (typeof value === "string" && value.trim().length > 0) {
        facts.push({
          claim: `${label} ${key}: ${value}`,
          source: label,
          confidence
        });
      }
    }
  }

  if (facts.length === 0) {
    facts.push({
      claim: `Goal: ${taskMap.goal}`,
      source: "TaskMap",
      confidence: 0.5
    });
  }

  return facts;
}

function severityFromText(text: string): "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (lower.includes("blocker") || lower.includes("critical")) {
    return "high";
  }
  if (text.length > 120 || lower.includes("unknown")) {
    return "medium";
  }
  return "low";
}

/**
 * Derive risk register from task map and context constraints
 */
export function assessRisks(taskMap: TaskMap, context: ContextPayload): Risk[] {
  const risks: Risk[] = [];

  // Safely iterate unknowns with type validation
  if (Array.isArray(taskMap.unknowns)) {
    taskMap.unknowns.forEach((unknown, index) => {
      if (typeof unknown === "string" && unknown.trim().length > 0) {
        risks.push({
          description: `Unknown ${index + 1}: ${unknown}`,
          severity: severityFromText(unknown),
          mitigation: `Answer or experiment: ${unknown}`
        });
      }
    });
  }

  // Safely iterate assumptions with type validation
  if (Array.isArray(taskMap.assumptions)) {
    taskMap.assumptions.forEach((assumption, index) => {
      if (typeof assumption === "string" && assumption.trim().length > 0) {
        risks.push({
          description: `Assumption ${index + 1}: ${assumption}`,
          severity: "medium",
          mitigation: `Validate assumption "${assumption}" early`
        });
      }
    });
  }

  // Safely access decision_matrix.constraints with full null/array validation
  const dmConstraints = context.decision_matrix?.constraints;
  if (Array.isArray(dmConstraints)) {
    dmConstraints.forEach((constraint) => {
      if (typeof constraint === "string" && constraint.trim().length > 0) {
        risks.push({
          description: `Decision matrix constraint: ${constraint}`,
          severity: severityFromText(constraint),
          mitigation: `Design around constraint "${constraint}"`
        });
      }
    });
  }

  if (risks.length === 0) {
    risks.push({
      description: "No explicit risks captured in input",
      severity: "low",
      mitigation: "Continuously monitor as context evolves"
    });
  }

  return risks;
}

/**
 * Normalize constraints into typed entries
 */
export function checkConstraints(context: ContextPayload): Constraint[] {
  const constraints: Constraint[] = [];
  const constraintSource = context.questions?.q3_constraints;

  // Safely add constraints with full type and array validation
  const addConstraints = (type: Constraint["type"], values?: unknown) => {
    if (!Array.isArray(values)) return;
    values.forEach((value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        constraints.push({ type, description: value });
      }
    });
  };

  if (constraintSource) {
    addConstraints("technical", constraintSource.technical);
    addConstraints("policy", constraintSource.policy);
    addConstraints("resource", constraintSource.resource);
  }

  const bounds = context.questions?.q4_bounds;
  if (bounds) {
    ["deadline", "sla", "window"].forEach((key) => {
      const description = (bounds as Record<string, string | number | undefined>)[key];
      if (typeof description === "string" && description.trim().length > 0) {
        constraints.push({ type: "time", description });
      }
    });
  }

  if (constraints.length === 0) {
    constraints.push({
      type: "resource",
      description: "No hard constraints provided; treat bandwidth as limited"
    });
  }

  return constraints;
}

/**
 * Evaluate alignment with operator values and context recommendation
 */
export function evaluateValuesAlignment(
  taskMap: TaskMap,
  context: ContextPayload
): ValuesAlignment[] {
  const alignments: ValuesAlignment[] = [];
  const recommendation = context.decision_matrix?.recommendation;

  // Validate recommendation object structure before accessing properties
  if (
    recommendation &&
    typeof recommendation.option === "string" &&
    typeof recommendation.rationale === "string"
  ) {
    alignments.push({
      value: `Decision option ${recommendation.option}`,
      alignment: "aligned",
      notes: recommendation.rationale
    });
  }

  taskMap.options.forEach((option) => {
    const optionNotes = `Pros: ${option.pros.join(", ") || "n/a"}. Cons: ${
      option.cons.join(", ") || "n/a"
    }.`;
    alignments.push({
      value: `Option ${option.id}`,
      alignment: "neutral",
      notes: optionNotes
    });
  });

  if (!alignments.length) {
    alignments.push({
      value: "Clarity",
      alignment: "neutral",
      notes: "No explicit decision matrix alignment provided"
    });
  }

  return alignments;
}

function deriveRecommendation(taskMap: TaskMap): string {
  if (taskMap.recommended_next.trim().length > 0) {
    return taskMap.recommended_next;
  }
  return "Gather additional evidence before selecting an option.";
}

/**
 * Build an EvidencePack from derived sections
 */
export function createEvidencePack(input: ResonantInput): EvidencePack {
  const facts = validateFacts(input.taskMap, input.context);
  const risks = assessRisks(input.taskMap, input.context);
  const constraints = checkConstraints(input.context);
  const valuesAlignment = evaluateValuesAlignment(input.taskMap, input.context);

  return {
    id: generateEvidencePackId(),
    created_at: new Date().toISOString(),
    task_map_ref: input.taskMap.id,
    facts,
    risks,
    constraints,
    values_alignment: valuesAlignment,
    recommendation: deriveRecommendation(input.taskMap)
  };
}

/**
 * Validate EvidencePack instances
 */
export function validateEvidencePack(evidencePack: unknown): {
  valid: boolean;
  errors?: string[];
  data?: EvidencePack;
} {
  const result = EvidencePackSchema.safeParse(evidencePack);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

/**
 * Create a permission guard scoped to the autonomy level
 */
function createPermissionGuard(level: AutonomyLevel) {
  return (permission: Permission) => {
    const check = validatePermissions(level, [permission]);
    if (!check.valid) {
      throw new PermissionDeniedError(permission, level, AGENT_ID);
    }
  };
}

/**
 * Run the Resonant agent
 */
export async function run(
  input: ResonantInput,
  config: RunnerConfig
): Promise<ResonantOutput> {
  const requirePermission = createPermissionGuard(config.autonomyLevel);

  try {
    requirePermission("read_repo");
    requirePermission("search_docs");

    const evidencePack = createEvidencePack(input);
    const validation = validateEvidencePack(evidencePack);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
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

/**
 * Agent metadata
 */
export const AGENT_METADATA = {
  id: "resonant",
  name: "Resonant",
  description: "Research and alignment agent - validates facts and surfaces risks",
  produces: "EvidencePack",
  permissions: "read-only"
} as const;
