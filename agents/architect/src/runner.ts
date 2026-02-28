/**
 * Architect Agent Runner
 *
 * Purpose: Convert EvidencePack artifacts into buildable DesignSpecs.
 * Permissions: Read-only across autonomy levels.
 */

import {
  DesignSpecSchema,
  type DesignSpec,
  type EvidencePack,
  type AcceptanceCriterion,
  type Interface,
  PermissionDeniedError,
  ValidationError,
  wrapError
} from "@slate/context-schema";
import {
  type AutonomyLevel,
  type Permission,
  validatePermissions
} from "./permissions.js";

const AGENT_ID = "architect" as const;

export interface ArchitectInput {
  evidencePack: EvidencePack;
}

export interface ArchitectOutput {
  success: boolean;
  artifact?: DesignSpec;
  errors?: string[];
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
}

function generateDesignSpecId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `ds-${date}-${random}`;
}

/**
 * Define scope statement from available evidence
 */
export function defineScope(evidencePack: EvidencePack): string {
  const topFacts = evidencePack.facts.slice(0, 3).map((fact) => fact.claim);
  const coreFocus = topFacts.join("; ");
  return (
    `Deliver solution aligned with recommendation "${evidencePack.recommendation}". ` +
    (coreFocus ? `Ground scope in: ${coreFocus}.` : "Ground scope in validated facts.")
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48) || "artifact";
}

/**
 * Create interface contracts based on constraints
 */
export function specifyInterfaces(evidencePack: EvidencePack): Interface[] {
  if (evidencePack.constraints.length === 0) {
    return [
      {
        name: "context_alignment_interface",
        inputs: ["context_payload", "task_map"],
        outputs: ["design_spec"],
        contract: "Maintain parity with validated facts and recommendation."
      }
    ];
  }

  return evidencePack.constraints.slice(0, 5).map((constraint, index) => ({
    name: `${constraint.type}_interface_${index + 1}`,
    inputs: ["context_payload", "evidence_pack"],
    outputs: [`${constraint.type}_strategy`],
    contract: `Must honor constraint: ${constraint.description}`
  }));
}

/**
 * Translate risks into acceptance criteria
 */
export function generateAcceptanceCriteria(
  evidencePack: EvidencePack
): AcceptanceCriterion[] {
  if (evidencePack.risks.length === 0) {
    return [
      {
        id: "AC-1",
        description: "Demonstrate evidence alignment and risk audit",
        verification: "Review logs link mitigation activities to each assumption."
      }
    ];
  }

  return evidencePack.risks.map((risk, index) => ({
    id: `AC-${index + 1}`,
    description: `Mitigate: ${risk.description}`,
    verification: `Show mitigation path: ${risk.mitigation}`
  }));
}

/**
 * Build a test plan outlining validation paths
 */
export function createTestPlan(evidencePack: EvidencePack): string {
  const phases = [
    "1. Validate that facts map to live systems/docs.",
    "2. Prove each interface contract with integration tests or prototypes.",
    "3. Demonstrate mitigation steps for every tracked risk.",
    "4. Review constraints with stakeholders and capture sign-off."
  ];

  if (evidencePack.constraints.length > 0) {
    phases.push(
      `5. Constraint verification: ${evidencePack.constraints
        .map((c) => `${c.type}:${c.description}`)
        .join("; ")}.`
    );
  }

  return phases.join("\n");
}

function createRollbackPlan(evidencePack: EvidencePack): string {
  const anchors = evidencePack.values_alignment
    .filter((entry) => entry.alignment !== "conflicts")
    .map((entry) => entry.value);

  return [
    "Rollback when constraints drift or values misalign.",
    anchors.length ? `Restore baseline values: ${anchors.join(", ")}.` : "Restore prior configuration."
  ].join(" ");
}

function deriveFilesToTouch(evidencePack: EvidencePack): string[] {
  const files = evidencePack.constraints.slice(0, 5).map((constraint) => {
    return `docs/constraints/${constraint.type}-${slugify(constraint.description)}.md`;
  });

  if (files.length === 0) {
    files.push("docs/design/README.md");
  }

  return files;
}

function deriveNonGoals(evidencePack: EvidencePack): string[] {
  const conflicts = evidencePack.values_alignment
    .filter((entry) => entry.alignment === "conflicts")
    .map((entry) => entry.value);

  if (conflicts.length > 0) {
    return conflicts.map((value) => `Avoid: ${value}`);
  }

  return ["Do not expand scope beyond validated evidence pack."];
}

/**
 * Create a DesignSpec artifact from evidence
 */
export function createDesignSpec(input: ArchitectInput): DesignSpec {
  const evidencePack = input.evidencePack;

  return {
    id: generateDesignSpecId(),
    created_at: new Date().toISOString(),
    evidence_pack_ref: evidencePack.id,
    scope: defineScope(evidencePack),
    non_goals: deriveNonGoals(evidencePack),
    interfaces: specifyInterfaces(evidencePack),
    files_to_touch: deriveFilesToTouch(evidencePack),
    acceptance_criteria: generateAcceptanceCriteria(evidencePack),
    test_plan: createTestPlan(evidencePack),
    rollback_plan: createRollbackPlan(evidencePack)
  };
}

/**
 * Validate DesignSpec instances
 */
export function validateDesignSpec(designSpec: unknown): {
  valid: boolean;
  errors?: string[];
  data?: DesignSpec;
} {
  const result = DesignSpecSchema.safeParse(designSpec);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

function createPermissionGuard(level: AutonomyLevel) {
  return (permission: Permission) => {
    const check = validatePermissions(level, [permission]);
    if (!check.valid) {
      throw new PermissionDeniedError(permission, level, AGENT_ID);
    }
  };
}

/**
 * Run the Architect agent
 */
export async function run(
  input: ArchitectInput,
  config: RunnerConfig
): Promise<ArchitectOutput> {
  const requirePermission = createPermissionGuard(config.autonomyLevel);

  try {
    requirePermission("read_repo");
    requirePermission("search_docs");

    const designSpec = createDesignSpec(input);
    const validation = validateDesignSpec(designSpec);

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
  id: "architect",
  name: "Architect",
  description: "Design and specification agent - transforms evidence into DesignSpecs",
  produces: "DesignSpec",
  permissions: "read-only"
} as const;
