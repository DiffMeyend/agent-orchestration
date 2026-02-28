/**
 * Polymath Agent Runner
 *
 * Purpose: Divergent exploration, surface unknowns, generate hypotheses.
 * Produces: TaskMap artifact
 * Permissions: Read-only at all autonomy levels
 */

import {
  TaskMapSchema,
  type TaskMap,
  type TaskMapOption,
  type ContextPayload,
  PermissionDeniedError,
  ValidationError,
  LLMError,
  wrapError
} from "@slate/context-schema";
import {
  createRouterFromEnv,
  type LLMRouter,
  LLMProviderError
} from "@slate/llm-provider";
import { type AutonomyLevel, validatePermissions, type Permission } from "./permissions.js";

const AGENT_ID = "polymath" as const;

export interface PolymathInput {
  context: ContextPayload;
  goal: string;
  constraints?: string[];
}

export interface PolymathOutput {
  success: boolean;
  artifact?: TaskMap;
  errors?: string[];
}

export interface LLMConfig {
  openaiModel?: string;
  anthropicModel?: string;
  maxTokens?: number;
}

interface ResolvedLLMConfig {
  router: LLMRouter;
  maxTokens: number;
}

export interface RunnerConfig {
  autonomyLevel: AutonomyLevel;
  sessionId?: string;
  llmConfig?: LLMConfig;
}

const DEFAULT_MAX_TOKENS = 2048;

const POLYMATH_SYSTEM_PROMPT = `You are Polymath, a divergent exploration agent in the SLATE system.

Your role is to explore a goal and context, then produce structured analysis. You think expansively, surface unknowns, identify assumptions, and generate multiple possible approaches.

You MUST respond with valid JSON matching this exact structure:
{
  "assumptions": ["string array of things being taken for granted"],
  "unknowns": ["string array of questions that need answers"],
  "options": [
    {
      "id": "unique-id",
      "description": "what this approach involves",
      "pros": ["advantages"],
      "cons": ["disadvantages"]
    }
  ],
  "quick_checks": ["low-cost validation steps"],
  "recommended_next": "single recommended next action"
}

Rules:
- Generate 2-4 distinct options that represent genuinely different approaches
- Surface 3-5 key unknowns that would change the approach if answered
- Identify 2-4 assumptions that should be validated
- Quick checks should be actionable in under 30 minutes each
- Be specific and actionable, not generic`;

function generateTaskMapId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `tm-${date}-${random}`;
}

function resolveLlmConfig(config?: LLMConfig): ResolvedLLMConfig {
  const router = createRouterFromEnv({
    openaiModel: config?.openaiModel,
    anthropicModel: config?.anthropicModel,
    maxTokens: config?.maxTokens || DEFAULT_MAX_TOKENS
  });

  const status = router.getStatus();
  if (status.availableProviders.length === 0) {
    throw new LLMError(
      "No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
      AGENT_ID,
      undefined,
      false
    );
  }

  return {
    router,
    maxTokens: config?.maxTokens || DEFAULT_MAX_TOKENS
  };
}

function formatContext(context: ContextPayload): string {
  const parts: string[] = [];

  if (context.questions) {
    parts.push("## Context (Ten Questions)");
    for (const [key, value] of Object.entries(context.questions)) {
      if (value && typeof value === "object") {
        parts.push(`### ${key}`);
        parts.push(JSON.stringify(value, null, 2));
      }
    }
  }

  if (context.decision_matrix) {
    parts.push("\n## Decision Matrix");
    parts.push(JSON.stringify(context.decision_matrix, null, 2));
  }

  return parts.join("\n");
}

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  config: ResolvedLLMConfig,
  maxTokensOverride?: number
): Promise<string> {
  try {
    const response = await config.router.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      maxTokens: maxTokensOverride ?? config.maxTokens
    });
    return response.content;
  } catch (error) {
    if (error instanceof LLMProviderError) {
      throw new LLMError(
        error.message,
        AGENT_ID,
        error.statusCode,
        error.retryable,
        error.cause
      );
    }
    throw new LLMError(
      error instanceof Error ? error.message : String(error),
      AGENT_ID,
      undefined,
      true
    );
  }
}

function parseJsonArray(value: string): unknown[] {
  const match = value.match(/\[[\s\S]*\]/);
  if (!match) {
    return [];
  }
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface LLMExplorationResult {
  assumptions: string[];
  unknowns: string[];
  options: TaskMapOption[];
  quick_checks: string[];
  recommended_next: string;
}

async function exploreWithLLM(
  goal: string,
  context: ContextPayload,
  constraints: string[] | undefined,
  llm: ResolvedLLMConfig
): Promise<LLMExplorationResult> {
  const contextStr = formatContext(context);
  const constraintsStr = constraints?.length
    ? `\n## Constraints\n${constraints.map((c) => `- ${c}`).join("\n")}`
    : "";

  const userPrompt = `## Goal
${goal}

${contextStr}${constraintsStr}

Explore this goal divergently. Surface unknowns, identify assumptions, and generate 2-4 distinct approaches. Respond with JSON only.`;

  const rawResponse = await callLLM(
    POLYMATH_SYSTEM_PROMPT,
    userPrompt,
    llm,
    llm.maxTokens
  );

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new LLMError(`No JSON found in LLM response: ${rawResponse}`, AGENT_ID);
  }

  const parsed = JSON.parse(jsonMatch[0]) as LLMExplorationResult;

  if (!Array.isArray(parsed.assumptions)) parsed.assumptions = [];
  if (!Array.isArray(parsed.unknowns)) parsed.unknowns = [];
  if (!Array.isArray(parsed.options)) parsed.options = [];
  if (!Array.isArray(parsed.quick_checks)) parsed.quick_checks = [];
  if (typeof parsed.recommended_next !== "string") parsed.recommended_next = "Gather more context";

  parsed.options = parsed.options.map((opt, idx) => ({
    id: opt.id || `option-${idx + 1}`,
    description: opt.description || "No description provided",
    pros: Array.isArray(opt.pros) ? opt.pros : [],
    cons: Array.isArray(opt.cons) ? opt.cons : []
  }));

  return parsed;
}

export async function extractAssumptions(
  context: ContextPayload,
  goal: string,
  config?: LLMConfig
): Promise<string[]> {
  const llm = resolveLlmConfig(config);
  const userPrompt = `Given this goal: "${goal}"

And this context:
${formatContext(context)}

List 3-5 key assumptions being made. Respond with a JSON array of strings only.`;
  const response = await callLLM(
    "You extract assumptions from goals and context. Respond with a JSON array of strings only.",
    userPrompt,
    llm,
    Math.min(1024, llm.maxTokens)
  );
  return parseJsonArray(response).filter((item): item is string => typeof item === "string");
}

export async function generateOptions(
  context: ContextPayload,
  goal: string,
  assumptions: string[],
  config?: LLMConfig
): Promise<TaskMapOption[]> {
  const llm = resolveLlmConfig(config);
  const userPrompt = `Given this goal: "${goal}"

Context:
${formatContext(context)}

Known assumptions:
${assumptions.map((a) => `- ${a}`).join("\n")}

Generate 2-4 distinct approaches. Each should be genuinely different, not variations of the same idea.
Respond with JSON array: [{ "id": "string", "description": "string", "pros": ["string"], "cons": ["string"] }]`;
  const response = await callLLM(
    "You generate divergent solution options. Respond with a JSON array only.",
    userPrompt,
    llm,
    Math.min(2048, llm.maxTokens)
  );
  const parsed = parseJsonArray(response);
  return parsed.map((opt, idx) => {
    const option = opt as TaskMapOption;
    return {
      id: option?.id || `option-${idx + 1}`,
      description: option?.description || "",
      pros: Array.isArray(option?.pros) ? option.pros : [],
      cons: Array.isArray(option?.cons) ? option.cons : []
    };
  });
}

export async function identifyUnknowns(
  context: ContextPayload,
  goal: string,
  config?: LLMConfig
): Promise<string[]> {
  const llm = resolveLlmConfig(config);
  const userPrompt = `Given this goal: "${goal}"

And this context:
${formatContext(context)}

List 3-5 key unknowns - questions that, if answered, would significantly change the approach.
Respond with a JSON array of strings only.`;
  const response = await callLLM(
    "You identify critical unknowns in a problem space. Respond with a JSON array of strings only.",
    userPrompt,
    llm,
    Math.min(1024, llm.maxTokens)
  );
  return parseJsonArray(response).filter((item): item is string => typeof item === "string");
}

export async function createTaskMap(
  input: PolymathInput,
  config?: LLMConfig
): Promise<TaskMap> {
  const llm = resolveLlmConfig(config);
  const exploration = await exploreWithLLM(
    input.goal,
    input.context,
    input.constraints,
    llm
  );

  const now = new Date().toISOString();

  return {
    id: generateTaskMapId(),
    created_at: now,
    goal: input.goal,
    assumptions: exploration.assumptions,
    unknowns: exploration.unknowns,
    options: exploration.options,
    quick_checks: exploration.quick_checks,
    recommended_next: exploration.recommended_next
  };
}

export function validateTaskMap(taskMap: unknown): {
  valid: boolean;
  errors?: string[];
  data?: TaskMap;
} {
  const result = TaskMapSchema.safeParse(taskMap);

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

export async function run(
  input: PolymathInput,
  config: RunnerConfig
): Promise<PolymathOutput> {
  const requirePermission = createPermissionGuard(config.autonomyLevel);

  try {
    requirePermission("read_repo");
    requirePermission("search_docs");

    let taskMap: TaskMap;
    try {
      taskMap = await createTaskMap(input, config.llmConfig);
    } catch (error) {
      const llmError =
        error instanceof LLMError
          ? error
          : new LLMError(
              error instanceof Error ? error.message : String(error),
              AGENT_ID,
              undefined,
              true,
              error instanceof Error ? error : undefined
            );
      throw llmError;
    }

    const validation = validateTaskMap(taskMap);
    if (!validation.valid) {
      throw new ValidationError("TaskMap", validation.errors || [], AGENT_ID);
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

export const AGENT_METADATA = {
  id: "polymath",
  name: "Polymath",
  description: "Divergent exploration agent - generates hypotheses and surfaces unknowns",
  produces: "TaskMap",
  permissions: "read-only"
} as const;
