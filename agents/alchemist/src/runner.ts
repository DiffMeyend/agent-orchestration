/**
 * Alchemist Agent Runner
 *
 * Purpose: Creative reframing when progress stalls. Produces OptionsSet artifacts.
 * Permissions: Read-only at all autonomy levels.
 */

import {
  OptionsSetSchema,
  type OptionsSet,
  type DesignSpec,
  type CreativeOption,
  PermissionDeniedError,
  ValidationError,
  wrapError
} from "@slate/context-schema";
import {
  type AutonomyLevel,
  type Permission,
  validatePermissions
} from "./permissions.js";

const AGENT_ID = "alchemist" as const;

export type AlchemistTrigger = "stuck" | "rejected" | "user_request" | "creative_block";

export interface AlchemistInput {
  designSpec: DesignSpec;
  trigger: AlchemistTrigger;
}

export interface AlchemistOutput {
  success: boolean;
  artifact?: OptionsSet;
  errors?: string[];
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
}

function generateOptionsSetId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `os-${date}-${random}`;
}

/**
 * Summarize the current situation in a new frame
 */
export function reframeProblem(designSpec: DesignSpec, trigger: AlchemistTrigger): string {
  const nonGoals = designSpec.non_goals.join("; ") || "No non-goals recorded";
  return `Trigger=${trigger}. Scope="${designSpec.scope}". Non-goals: ${nonGoals}.`;
}

/**
 * Identify latent risks from acceptance criteria and rollback plan
 */
export function identifyRisks(designSpec: DesignSpec): string[] {
  const risks = new Set<string>();

  designSpec.acceptance_criteria.forEach((criterion) => {
    risks.add(`Failing to satisfy ${criterion.description}`);
  });

  if (designSpec.rollback_plan.trim().length > 0) {
    risks.add(`Rollback needed: ${designSpec.rollback_plan}`);
  }

  return Array.from(risks);
}

/**
 * Generate creative alternatives
 */
export function generateAlternatives(
  designSpec: DesignSpec,
  trigger: AlchemistTrigger
): CreativeOption[] {
  const risks = identifyRisks(designSpec);
  const preserves = designSpec.acceptance_criteria.map((criterion) => criterion.id);

  const options: CreativeOption[] = designSpec.interfaces.slice(0, 3).map((iface, index) => ({
    option_id: `ALT-${index + 1}`,
    reframe: `Treat ${iface.name} as an independent capability to unblock ${trigger}`,
    approach: `Prototype ${iface.outputs.join(", ")} with mocked ${iface.inputs.join(", ")}`,
    preserves: preserves.slice(0, 3),
    risks: risks.slice(0, 3),
    value_add: `De-risks contract "${iface.contract}"`
  }));

  if (options.length === 0) {
    options.push({
      option_id: "ALT-1",
      reframe: `Simplify scope to acceptance criteria only`,
      approach: "Deliver smallest viable vertical slice to regain momentum",
      preserves: preserves.slice(0, 3),
      risks: risks.slice(0, 3),
      value_add: "Provides concrete artifact for validation"
    });
  }

  return options;
}

/**
 * Select conservative default option
 */
export function selectSafeDefault(options: CreativeOption[]): string {
  if (options.length === 0) {
    return "ALT-1";
  }
  return options[0].option_id;
}

/**
 * Build OptionsSet artifact
 */
export function createOptionsSet(input: AlchemistInput): OptionsSet {
  const reframed = reframeProblem(input.designSpec, input.trigger);
  const options = generateAlternatives(input.designSpec, input.trigger);
  const safeDefault = selectSafeDefault(options);

  return {
    id: generateOptionsSetId(),
    created_at: new Date().toISOString(),
    design_spec_ref: input.designSpec.id,
    trigger: input.trigger,
    options: options.map((option, index) => ({
      option_id: option.option_id ?? `ALT-${index + 1}`,
      reframe: `${reframed} | ${option.reframe}`,
      approach: option.approach,
      preserves: option.preserves,
      risks: option.risks,
      value_add: option.value_add
    })),
    safe_default: safeDefault
  };
}

/**
 * Validate OptionsSet output
 */
export function validateOptionsSet(optionsSet: unknown): {
  valid: boolean;
  errors?: string[];
  data?: OptionsSet;
} {
  const result = OptionsSetSchema.safeParse(optionsSet);
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
 * Run the Alchemist agent
 */
export async function run(
  input: AlchemistInput,
  config: RunnerConfig
): Promise<AlchemistOutput> {
  const requirePermission = createPermissionGuard(config.autonomyLevel);

  try {
    requirePermission("read_repo");
    requirePermission("search_docs");

    const optionsSet = createOptionsSet(input);
    const validation = validateOptionsSet(optionsSet);

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
  id: "alchemist",
  name: "Alchemist",
  description: "Creative reframing agent - produces OptionsSet artifacts when work is stuck",
  produces: "OptionsSet",
  permissions: "read-only"
} as const;
