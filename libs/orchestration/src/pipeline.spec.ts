/**
 * Pipeline tests
 */

import { describe, it, expect } from "vitest";
import {
  PIPELINE_ORDER,
  SKIPPABLE_STEPS,
  getNextStep,
  getPreviousStep,
  isValidStep,
  canProceed,
  canSkipStep,
  createPipelineResult,
  createFallbackEvidencePack,
  recordDegradation,
  handleStepFailure
} from "./pipeline.js";
import type { PipelineResult } from "./pipeline.js";

describe("Pipeline Order", () => {
  it("should have correct pipeline order", () => {
    expect(PIPELINE_ORDER).toEqual([
      "polymath",
      "resonant",
      "architect",
      "executor",
      "horizon"
    ]);
  });

  it("should identify resonant as skippable", () => {
    expect(SKIPPABLE_STEPS).toContain("resonant");
    expect(SKIPPABLE_STEPS).not.toContain("polymath");
    expect(SKIPPABLE_STEPS).not.toContain("executor");
  });
});

describe("getNextStep", () => {
  it("should return next step in pipeline", () => {
    expect(getNextStep("polymath")).toBe("resonant");
    expect(getNextStep("resonant")).toBe("architect");
    expect(getNextStep("architect")).toBe("executor");
    expect(getNextStep("executor")).toBe("horizon");
  });

  it("should return undefined for last step", () => {
    expect(getNextStep("horizon")).toBeUndefined();
  });
});

describe("getPreviousStep", () => {
  it("should return previous step in pipeline", () => {
    expect(getPreviousStep("horizon")).toBe("executor");
    expect(getPreviousStep("executor")).toBe("architect");
    expect(getPreviousStep("architect")).toBe("resonant");
    expect(getPreviousStep("resonant")).toBe("polymath");
  });

  it("should return undefined for first step", () => {
    expect(getPreviousStep("polymath")).toBeUndefined();
  });
});

describe("isValidStep", () => {
  it("should validate pipeline steps", () => {
    expect(isValidStep("polymath")).toBe(true);
    expect(isValidStep("resonant")).toBe(true);
    expect(isValidStep("architect")).toBe(true);
    expect(isValidStep("executor")).toBe(true);
    expect(isValidStep("horizon")).toBe(true);
    expect(isValidStep("alchemist")).toBe(true);
  });

  it("should reject invalid steps", () => {
    expect(isValidStep("invalid")).toBe(false);
    expect(isValidStep("")).toBe(false);
  });
});

describe("canSkipStep", () => {
  it("should identify skippable steps", () => {
    expect(canSkipStep("resonant")).toBe(true);
  });

  it("should identify non-skippable steps", () => {
    expect(canSkipStep("polymath")).toBe(false);
    expect(canSkipStep("architect")).toBe(false);
    expect(canSkipStep("executor")).toBe(false);
    expect(canSkipStep("horizon")).toBe(false);
  });
});

describe("canProceed", () => {
  it("should allow proceeding when all artifacts present", () => {
    const result = createPipelineResult();
    result.artifacts.taskMapId = "tm-1";
    result.artifacts.evidencePackId = "ep-1";

    const check = canProceed(result, "architect");
    expect(check.proceed).toBe(true);
  });

  it("should block when required artifact missing", () => {
    const result = createPipelineResult();
    result.artifacts.taskMapId = "tm-1";
    // Missing evidencePackId

    const check = canProceed(result, "architect");
    expect(check.proceed).toBe(false);
    expect(check.reason).toContain("EvidencePack");
  });

  it("should indicate degraded mode", () => {
    const result = createPipelineResult();
    result.artifacts.taskMapId = "tm-1";
    result.artifacts.evidencePackId = "ep-fallback-1";
    result.degradation.isDegraaded = true;

    const check = canProceed(result, "architect");
    expect(check.proceed).toBe(true);
    expect(check.degraded).toBe(true);
  });
});

describe("createFallbackEvidencePack", () => {
  it("should create valid fallback EvidencePack", () => {
    const fallback = createFallbackEvidencePack("tm-123", "LLM API error");

    expect(fallback.id).toMatch(/^ep-fallback-/);
    expect(fallback.task_map_ref).toBe("tm-123");
    expect(fallback.facts).toHaveLength(1);
    expect(fallback.facts[0].confidence).toBe(0);
    expect(fallback.risks).toHaveLength(2);
    expect(fallback.risks[1].description).toContain("LLM API error");
    expect(fallback.constraints).toHaveLength(1);
    expect(fallback.constraints[0].type).toBe("resource");
    expect(fallback.recommendation).toContain("CAUTION");
  });

  it("should include error message in risks", () => {
    const fallback = createFallbackEvidencePack("tm-1", "Connection timeout");

    const errorRisk = fallback.risks.find(r => r.description.includes("Connection timeout"));
    expect(errorRisk).toBeDefined();
  });
});

describe("recordDegradation", () => {
  it("should record degradation state", () => {
    const result = createPipelineResult();

    recordDegradation(result, "resonant", "ep-fallback-1", "Resonant failed due to timeout");

    expect(result.degradation.isDegraaded).toBe(true);
    expect(result.degradation.skippedSteps).toContain("resonant");
    expect(result.degradation.fallbackArtifacts).toContain("ep-fallback-1");
    expect(result.degradation.warnings).toHaveLength(1);
  });

  it("should accumulate multiple degradations", () => {
    const result = createPipelineResult();

    recordDegradation(result, "resonant", "ep-fallback-1", "First failure");
    recordDegradation(result, "resonant", "ep-fallback-2", "Retry failure");

    expect(result.degradation.skippedSteps).toHaveLength(2);
    expect(result.degradation.fallbackArtifacts).toHaveLength(2);
    expect(result.degradation.warnings).toHaveLength(2);
  });
});

describe("handleStepFailure", () => {
  it("should allow continuation for skippable steps", () => {
    const result = createPipelineResult();
    result.artifacts.taskMapId = "tm-1";

    const outcome = handleStepFailure(
      result,
      "resonant",
      "LLM API error",
      () => ({ artifactId: "ep-fallback-1", artifactKey: "evidencePackId" })
    );

    expect(outcome.canContinue).toBe(true);
    expect(outcome.fallbackId).toBe("ep-fallback-1");
    expect(outcome.warning).toContain("resonant");
    expect(result.artifacts.evidencePackId).toBe("ep-fallback-1");
  });

  it("should abort for non-skippable steps", () => {
    const result = createPipelineResult();

    const outcome = handleStepFailure(
      result,
      "polymath",
      "Critical failure",
      () => null
    );

    expect(outcome.canContinue).toBe(false);
    expect(result.error).toContain("polymath");
  });

  it("should abort if fallback creation fails", () => {
    const result = createPipelineResult();

    const outcome = handleStepFailure(
      result,
      "resonant",
      "Error",
      () => null
    );

    expect(outcome.canContinue).toBe(false);
    expect(result.error).toContain("no fallback available");
  });

  it("should track degradation state after graceful skip", () => {
    const result = createPipelineResult();
    result.artifacts.taskMapId = "tm-1";

    handleStepFailure(
      result,
      "resonant",
      "Timeout error",
      () => ({ artifactId: "ep-fallback-1", artifactKey: "evidencePackId" })
    );

    expect(result.degradation.isDegraaded).toBe(true);
    expect(result.degradation.skippedSteps).toContain("resonant");
    expect(result.degradation.warnings[0]).toContain("Timeout error");
  });
});

describe("Graceful Degradation Integration", () => {
  it("should allow full pipeline with fallback EvidencePack", () => {
    const result = createPipelineResult();

    // Step 1: Polymath succeeds
    result.artifacts.taskMapId = "tm-1";
    result.completedSteps.push("polymath");

    // Step 2: Resonant fails, create fallback
    const fallback = createFallbackEvidencePack("tm-1", "API rate limit exceeded");
    result.artifacts.evidencePackId = fallback.id;
    recordDegradation(result, "resonant", fallback.id, "Resonant skipped due to rate limit");

    // Step 3: Architect can proceed (with degraded flag)
    const architectCheck = canProceed(result, "architect");
    expect(architectCheck.proceed).toBe(true);
    expect(architectCheck.degraded).toBe(true);

    // Pipeline continues successfully
    result.artifacts.designSpecId = "ds-1";
    result.completedSteps.push("architect");

    result.artifacts.patchSetId = "ps-1";
    result.completedSteps.push("executor");

    const horizonCheck = canProceed(result, "horizon");
    expect(horizonCheck.proceed).toBe(true);

    // Final state
    expect(result.degradation.isDegraaded).toBe(true);
    expect(result.degradation.skippedSteps).toEqual(["resonant"]);
    expect(result.completedSteps).toEqual(["polymath", "architect", "executor"]);
  });
});
