/**
 * Pipeline Definition
 *
 * Defines agent execution order and orchestration logic.
 */

import type { PipelineStep } from "./session.js";
import type { EvidencePack } from "@slate/context-schema";

/**
 * Standard pipeline order
 */
export const PIPELINE_ORDER: PipelineStep[] = [
  "polymath",
  "resonant",
  "architect",
  "executor",
  "horizon"
];

/**
 * Steps that can be skipped with graceful degradation
 * When these steps fail, the pipeline continues with reduced context
 */
export const SKIPPABLE_STEPS: PipelineStep[] = ["resonant"];

/**
 * Degradation state tracking
 */
export interface DegradationState {
  isDegraaded: boolean;
  skippedSteps: PipelineStep[];
  fallbackArtifacts: string[];
  warnings: string[];
}

/**
 * Create initial degradation state
 */
export function createDegradationState(): DegradationState {
  return {
    isDegraaded: false,
    skippedSteps: [],
    fallbackArtifacts: [],
    warnings: []
  };
}

/**
 * Check if a step can be skipped (graceful degradation)
 */
export function canSkipStep(step: PipelineStep): boolean {
  return SKIPPABLE_STEPS.includes(step);
}

/**
 * Create a fallback EvidencePack when Resonant fails
 * This allows the pipeline to continue with reduced context
 */
export function createFallbackEvidencePack(
  taskMapId: string,
  errorMessage: string
): EvidencePack {
  const now = new Date().toISOString();
  const random = Math.random().toString(36).substring(2, 8);

  return {
    id: `ep-fallback-${random}`,
    created_at: now,
    task_map_ref: taskMapId,
    facts: [
      {
        claim: "Evidence gathering was skipped due to Resonant failure",
        source: "fallback",
        confidence: 0
      }
    ],
    risks: [
      {
        description: "Proceeding without full evidence validation - increased risk of incomplete analysis",
        severity: "medium",
        mitigation: "Manual review recommended before proceeding to production"
      },
      {
        description: `Original error: ${errorMessage}`,
        severity: "low",
        mitigation: "Address underlying issue for future runs"
      }
    ],
    constraints: [
      {
        type: "resource",
        description: "Operating in degraded mode - Resonant agent unavailable"
      }
    ],
    values_alignment: [],
    recommendation: "CAUTION: This EvidencePack was generated as a fallback due to Resonant failure. " +
      "The pipeline will continue with reduced context. Manual verification is recommended."
  };
}

/**
 * Get the next step in the pipeline
 */
export function getNextStep(current: PipelineStep): PipelineStep | undefined {
  const index = PIPELINE_ORDER.indexOf(current);
  if (index === -1 || index === PIPELINE_ORDER.length - 1) {
    return undefined;
  }
  return PIPELINE_ORDER[index + 1];
}

/**
 * Get the previous step in the pipeline
 */
export function getPreviousStep(current: PipelineStep): PipelineStep | undefined {
  const index = PIPELINE_ORDER.indexOf(current);
  if (index <= 0) {
    return undefined;
  }
  return PIPELINE_ORDER[index - 1];
}

/**
 * Check if a step is in the pipeline
 */
export function isValidStep(step: string): step is PipelineStep {
  return PIPELINE_ORDER.includes(step as PipelineStep) || step === "alchemist";
}

/**
 * Agent metadata for pipeline execution
 */
export interface AgentMetadata {
  id: PipelineStep;
  name: string;
  produces: string;
  requires?: string[];
}

export const AGENT_METADATA: Record<PipelineStep | "alchemist", AgentMetadata> = {
  polymath: {
    id: "polymath",
    name: "Polymath",
    produces: "TaskMap",
    requires: []
  },
  resonant: {
    id: "resonant",
    name: "Resonant",
    produces: "EvidencePack",
    requires: ["TaskMap"]
  },
  architect: {
    id: "architect",
    name: "Architect",
    produces: "DesignSpec",
    requires: ["EvidencePack"]
  },
  executor: {
    id: "executor",
    name: "Executor",
    produces: "PatchSet",
    requires: ["DesignSpec"]
  },
  horizon: {
    id: "horizon",
    name: "Horizon",
    produces: "ShipDecision",
    requires: ["PatchSet", "DesignSpec"]
  },
  alchemist: {
    id: "alchemist" as PipelineStep,
    name: "Alchemist",
    produces: "OptionsSet",
    requires: ["DesignSpec"]
  }
};

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  completedSteps: PipelineStep[];
  currentStep?: PipelineStep;
  error?: string;
  degradation: DegradationState;
  artifacts: {
    taskMapId?: string;
    evidencePackId?: string;
    designSpecId?: string;
    patchSetId?: string;
    shipDecisionId?: string;
    optionsSetId?: string;
  };
}

/**
 * Create an empty pipeline result
 */
export function createPipelineResult(): PipelineResult {
  return {
    success: false,
    completedSteps: [],
    degradation: createDegradationState(),
    artifacts: {}
  };
}

/**
 * Record a skipped step due to graceful degradation
 */
export function recordDegradation(
  result: PipelineResult,
  step: PipelineStep,
  fallbackArtifactId: string,
  warning: string
): void {
  result.degradation.isDegraaded = true;
  result.degradation.skippedSteps.push(step);
  result.degradation.fallbackArtifacts.push(fallbackArtifactId);
  result.degradation.warnings.push(warning);
}

/**
 * Check if pipeline can proceed to the next step
 */
export function canProceed(
  result: PipelineResult,
  nextStep: PipelineStep
): { proceed: boolean; reason?: string; degraded?: boolean } {
  const metadata = AGENT_METADATA[nextStep];
  if (!metadata) {
    return { proceed: false, reason: `Unknown step: ${nextStep}` };
  }

  // Check required artifacts
  for (const required of metadata.requires || []) {
    const artifactKey = `${required.charAt(0).toLowerCase()}${required.slice(1)}Id` as keyof PipelineResult["artifacts"];
    if (!result.artifacts[artifactKey]) {
      return {
        proceed: false,
        reason: `Missing required artifact: ${required}`
      };
    }
  }

  // Check if proceeding in degraded mode
  const degraded = result.degradation.isDegraaded;

  return { proceed: true, degraded };
}

/**
 * Handle step failure with graceful degradation
 * Returns true if pipeline can continue, false if it must abort
 */
export function handleStepFailure(
  result: PipelineResult,
  failedStep: PipelineStep,
  error: string,
  createFallback: () => { artifactId: string; artifactKey: keyof PipelineResult["artifacts"] } | null
): { canContinue: boolean; fallbackId?: string; warning?: string } {
  // Check if this step can be skipped
  if (!canSkipStep(failedStep)) {
    result.error = `Pipeline failed at ${failedStep}: ${error}`;
    return { canContinue: false };
  }

  // Create fallback artifact
  const fallback = createFallback();
  if (!fallback) {
    result.error = `Pipeline failed at ${failedStep}: ${error} (no fallback available)`;
    return { canContinue: false };
  }

  // Record the degradation
  const warning = `Step '${failedStep}' failed and was skipped: ${error}. ` +
    `Pipeline continuing with fallback artifact ${fallback.artifactId}.`;

  recordDegradation(result, failedStep, fallback.artifactId, warning);
  result.artifacts[fallback.artifactKey] = fallback.artifactId;

  return {
    canContinue: true,
    fallbackId: fallback.artifactId,
    warning
  };
}
