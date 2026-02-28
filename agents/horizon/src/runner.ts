/**
 * Horizon Agent Runner
 *
 * Purpose: Verify patches, run checks, decide ship/iterate/reject.
 * Produces: ShipDecision + ReleaseNotes artifacts
 * Permissions: Read-only with verification capabilities
 */

import { execSync } from "child_process";
import {
  ShipDecisionSchema,
  ReleaseNotesSchema,
  type ShipDecision,
  type ReleaseNotes,
  type PatchSet,
  type DesignSpec,
  PermissionDeniedError,
  ValidationError,
  wrapError
} from "@slate/context-schema";
import {
  type AutonomyLevel,
  validatePermissions,
  canApproveMerge,
  type Permission
} from "./permissions.js";

const AGENT_ID = "horizon" as const;

export interface HorizonInput {
  patchSet: PatchSet;
  designSpec: DesignSpec;
  cssScore: number;
  worktreePath?: string;
  reviewMetrics?: ReviewMetrics;
  objections?: string[];
}

export interface HorizonOutput {
  success: boolean;
  shipDecision?: ShipDecision;
  releaseNotes?: ReleaseNotes;
  errors?: string[];
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
}

/**
 * Anti-pattern types that Horizon detects
 */
export type AntiPattern =
  | "hesitation"         // review_count > 2 with no new findings
  | "analysis_paralysis" // time_in_review > 2x estimated
  | "carelessness"       // review_time < min_threshold
  | "egotism"            // objection not in acceptance criteria
  | "arrogance";         // test_coverage < threshold

/**
 * Review metrics for anti-pattern detection
 */
export interface ReviewMetrics {
  reviewCount: number;
  elapsedTimeMs: number;
  estimatedTimeMs: number;
  reviewDurationMs: number;
  findingsCount: number;
  previousFindingsCount: number;
}

/**
 * Ship gate requirements
 */
export interface ShipGates {
  allAcceptanceCriteriaMet: boolean;
  testCoverage: number;
  securityScanPass: boolean;
  rollbackPlanDocumented: boolean;
  cssScore: number;
}

/**
 * Security scan result
 */
export interface SecurityScanResult {
  pass: boolean;
  vulnerabilities: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  report: string;
}

/**
 * Acceptance criteria check result
 */
export interface CriterionResult {
  id: string;
  description: string;
  met: boolean;
  evidence?: string;
}

// Thresholds
const MIN_REVIEW_MS = 30000; // 30 seconds minimum review time
const COVERAGE_THRESHOLD = 0.8; // 80% test coverage

/**
 * Generate a unique ShipDecision ID
 */
function generateShipDecisionId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `sd-${date}-${random}`;
}

/**
 * Generate a unique ReleaseNotes ID
 */
function generateReleaseNotesId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `rn-${date}-${random}`;
}

/**
 * Run npm audit security scan
 */
export function runSecurityScan(worktreePath: string): SecurityScanResult {
  try {
    const result = execSync("npm audit --json", {
      cwd: worktreePath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000
    });

    const audit = JSON.parse(result);
    const vulnerabilities = audit.metadata?.vulnerabilities ?? {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0
    };

    // Fail on critical or high vulnerabilities
    const pass = vulnerabilities.critical === 0 && vulnerabilities.high === 0;

    return {
      pass,
      vulnerabilities,
      report: result
    };
  } catch (error: unknown) {
    // npm audit returns non-zero when vulnerabilities found
    const execError = error as {
      status?: number;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      message?: string;
    };

    try {
      const stdout = execError.stdout?.toString() || "{}";
      const audit = JSON.parse(stdout);
      const vulnerabilities = audit.metadata?.vulnerabilities ?? {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0
      };

      return {
        pass: vulnerabilities.critical === 0 && vulnerabilities.high === 0,
        vulnerabilities,
        report: stdout
      };
    } catch {
      // If we can't parse the output, fail the scan
      return {
        pass: false,
        vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 },
        report: `Scan failed: ${execError.message ?? "Unknown error"}`
      };
    }
  }
}

/**
 * Check if acceptance criteria are met based on test results
 */
export function checkAcceptanceCriteria(
  designSpec: DesignSpec,
  patchSet: PatchSet
): { allMet: boolean; results: CriterionResult[] } {
  const results: CriterionResult[] = [];

  for (const criterion of designSpec.acceptance_criteria) {
    // Look for evidence in test results
    const testEvidence = patchSet.test_results.find(
      (tr) =>
        tr.details.includes(criterion.id) ||
        tr.details.toLowerCase().includes(criterion.description.toLowerCase())
    );

    // Also check command results for verification
    const cmdEvidence = patchSet.commands_run.find(
      (cmd) =>
        cmd.stdout.includes(criterion.id) ||
        cmd.stdout.toLowerCase().includes(criterion.description.toLowerCase())
    );

    // Consider met if:
    // 1. Found in passing tests, OR
    // 2. Found in successful commands, OR
    // 3. All tests passed and we have some test evidence
    const hasTestEvidence = testEvidence && testEvidence.failed === 0;
    const hasCmdEvidence = cmdEvidence && cmdEvidence.exit_code === 0;
    const allTestsPassing = patchSet.test_results.every((tr) => tr.failed === 0);

    const met = hasTestEvidence || hasCmdEvidence || (allTestsPassing && patchSet.test_results.length > 0);

    results.push({
      id: criterion.id,
      description: criterion.description,
      met,
      evidence: testEvidence?.details || cmdEvidence?.stdout
    });
  }

  return {
    allMet: results.length === 0 || results.every((r) => r.met),
    results
  };
}

/**
 * Detect anti-patterns in the review process
 */
export function detectAntiPatterns(
  metrics: ReviewMetrics | undefined,
  gates: ShipGates,
  designSpec: DesignSpec,
  objections?: string[]
): AntiPattern[] {
  const detected: AntiPattern[] = [];

  if (metrics) {
    // Hesitation: multiple reviews with no new findings
    if (metrics.reviewCount > 2 && metrics.findingsCount <= metrics.previousFindingsCount) {
      detected.push("hesitation");
    }

    // Analysis Paralysis: taking too long
    if (metrics.elapsedTimeMs > 2 * metrics.estimatedTimeMs) {
      detected.push("analysis_paralysis");
    }

    // Carelessness: review too fast
    if (metrics.reviewDurationMs < MIN_REVIEW_MS && metrics.reviewDurationMs > 0) {
      detected.push("carelessness");
    }
  }

  // Egotism: objection not in acceptance criteria
  if (objections && objections.length > 0) {
    const criteriaDescriptions = designSpec.acceptance_criteria.map((c) =>
      c.description.toLowerCase()
    );
    const irrelevantObjections = objections.filter(
      (obj) => !criteriaDescriptions.some((desc) => desc.includes(obj.toLowerCase()))
    );
    if (irrelevantObjections.length > 0) {
      detected.push("egotism");
    }
  }

  // Arrogance: insufficient test coverage
  if (gates.testCoverage < COVERAGE_THRESHOLD) {
    detected.push("arrogance");
  }

  return detected;
}

/**
 * Evaluate ship gates
 */
export function evaluateShipGates(
  patchSet: PatchSet,
  designSpec: DesignSpec,
  cssScore: number,
  worktreePath?: string
): ShipGates {
  // Calculate test metrics
  const totalTests = patchSet.test_results.reduce(
    (sum, r) => sum + r.passed + r.failed + r.skipped,
    0
  );
  const passedTests = patchSet.test_results.reduce((sum, r) => sum + r.passed, 0);
  const testCoverage = totalTests > 0 ? passedTests / totalTests : 0;

  // Check acceptance criteria
  const criteriaCheck = checkAcceptanceCriteria(designSpec, patchSet);

  // Run security scan if worktree path provided
  let securityScanPass = true;
  if (worktreePath) {
    const securityResult = runSecurityScan(worktreePath);
    securityScanPass = securityResult.pass;
  }

  return {
    allAcceptanceCriteriaMet: criteriaCheck.allMet,
    testCoverage,
    securityScanPass,
    rollbackPlanDocumented: !!designSpec.rollback_plan && designSpec.rollback_plan.length > 0,
    cssScore
  };
}

/**
 * Determine ship decision based on gates
 */
export function determineDecision(gates: ShipGates): "ship" | "iterate" | "reject" {
  // Auto-ship conditions
  if (
    gates.allAcceptanceCriteriaMet &&
    gates.testCoverage >= COVERAGE_THRESHOLD &&
    gates.securityScanPass &&
    gates.rollbackPlanDocumented &&
    gates.cssScore >= 80
  ) {
    return "ship";
  }

  // Force iterate conditions
  if (!gates.allAcceptanceCriteriaMet || !gates.securityScanPass) {
    return "iterate";
  }

  // Default to iterate for safety
  return "iterate";
}

/**
 * Create a ShipDecision from review
 */
export function createShipDecision(
  input: HorizonInput,
  gates: ShipGates,
  antiPatterns: AntiPattern[]
): ShipDecision {
  const now = new Date().toISOString();
  const decision = determineDecision(gates);

  const blockingIssues: string[] = [];
  if (!gates.allAcceptanceCriteriaMet) {
    blockingIssues.push("Not all acceptance criteria met");
  }
  if (gates.testCoverage < COVERAGE_THRESHOLD) {
    blockingIssues.push(`Test coverage ${(gates.testCoverage * 100).toFixed(0)}% below 80% threshold`);
  }
  if (!gates.securityScanPass) {
    blockingIssues.push("Security scan failed - critical or high vulnerabilities found");
  }
  if (!gates.rollbackPlanDocumented) {
    blockingIssues.push("Rollback plan not documented");
  }
  if (gates.cssScore < 80) {
    blockingIssues.push(`CSS score ${gates.cssScore} below 80 threshold`);
  }

  // Generate followups from anti-patterns
  const followups: string[] = [];
  for (const pattern of antiPatterns) {
    switch (pattern) {
      case "hesitation":
        followups.push("Evidence unchanged across reviews - forcing decision");
        break;
      case "analysis_paralysis":
        followups.push("Review duration exceeded estimate - consider time-boxing");
        break;
      case "carelessness":
        followups.push("Review completed too quickly - recommend re-review");
        break;
      case "egotism":
        followups.push("Objection not aligned with acceptance criteria - document rationale");
        break;
      case "arrogance":
        followups.push("Test coverage below threshold - add tests before shipping");
        break;
    }
  }

  return {
    id: generateShipDecisionId(),
    created_at: now,
    patch_set_ref: input.patchSet.id,
    decision,
    rationale:
      decision === "ship"
        ? "All ship gates passed"
        : `Blocked by: ${blockingIssues.join(", ")}`,
    blocking_issues: blockingIssues,
    followups,
    anti_patterns_detected: antiPatterns
  };
}

/**
 * Create ReleaseNotes when shipping
 */
export function createReleaseNotes(
  shipDecision: ShipDecision,
  patchSet: PatchSet
): ReleaseNotes {
  return {
    id: generateReleaseNotesId(),
    ship_decision_ref: shipDecision.id,
    summary: patchSet.diff_summary,
    changes: patchSet.files_changed.map((f) => `Modified: ${f}`),
    breaking_changes: [],
    migration_steps: []
  };
}

/**
 * Validate a ShipDecision against the schema
 */
export function validateShipDecision(shipDecision: unknown): {
  valid: boolean;
  errors?: string[];
  data?: ShipDecision;
} {
  const result = ShipDecisionSchema.safeParse(shipDecision);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

/**
 * Create a permission guard scoped to Horizon's autonomy level
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
 * Run the Horizon agent
 */
export async function run(
  input: HorizonInput,
  config: RunnerConfig
): Promise<HorizonOutput> {
  const requirePermission = createPermissionGuard(config.autonomyLevel);

  try {
    requirePermission("read_repo");
    requirePermission("diff_view");
    if (input.worktreePath) {
      requirePermission("run_verification_tests");
    }

    // Evaluate ship gates
    const gates = evaluateShipGates(
      input.patchSet,
      input.designSpec,
      input.cssScore,
      input.worktreePath
    );

    // Detect anti-patterns
    const antiPatterns = detectAntiPatterns(
      input.reviewMetrics,
      gates,
      input.designSpec,
      input.objections
    );

    // Create ShipDecision
    const shipDecision = createShipDecision(input, gates, antiPatterns);

    // Validate output
    const validation = validateShipDecision(shipDecision);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Create ReleaseNotes if shipping
    let releaseNotes: ReleaseNotes | undefined;
    if (shipDecision.decision === "ship") {
      releaseNotes = createReleaseNotes(shipDecision, input.patchSet);
    }

    return {
      success: true,
      shipDecision: validation.data,
      releaseNotes
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
  id: "horizon",
  name: "Horizon",
  description: "Review and ship decision agent - verifies patches and decides ship/iterate/reject",
  produces: "ShipDecision + ReleaseNotes",
  permissions: "read-only with verification"
} as const;
