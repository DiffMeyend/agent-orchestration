// mcp/slate-runtime/src/server.ts
import path from "node:path";
import { existsSync } from "node:fs";
import {
  CSSCalculator,
  type RuntimeMode
} from "@slate/basis";
import {
  ContextPayloadSchema,
  type ContextPayload,
  PERMISSION_MATRIX,
  validatePermissions as validateAgentPermissions,
  type AgentId,
  type AutonomyLevel,
  type Permission
} from "@slate/context-schema";
import {
  getRuntimeState,
  isRuntimeState,
  normalizeStateName,
  RuntimeStateName,
  RuntimeStateTag,
  setRuntimeState
} from "./runtimeState.js";
import { getSnippet, listSnippets, refreshSnippets } from "./snippets.js";
import { appendLog, getLogs } from "./logs.js";
import { decideAutonomy, TaskType } from "./manifest.js";
import { getMode, setMode, Mode } from "./switches.js";
import {
  appendHistory,
  getHistory,
  getHistoryStatus,
  historyStats,
  initHistory,
  rotateHistory,
  HISTORY_EVENT_TYPES,
  HISTORY_EVENT_TYPES_ARRAY
} from './history.js';
import type { SlateHistoryEventType } from 'slate-contracts';
import {
  createWorktree,
  getWorktree,
  listWorktrees,
  cleanupWorktree,
  markWorktreeMerged,
  markWorktreeRejected,
  checkGitEnvironment
} from './worktree.js';
import {
  registerArtifact,
  queryArtifacts,
  getArtifact,
  getArtifactChain,
  type ArtifactType
} from './artifacts.js';
import {
  SessionManager,
  type SessionConfig
} from '@slate/orchestration';
import {
  startAgentExecution,
  getAgentExecutionStatus,
  listSessionExecutions,
  isExecutableAgent,
  EXECUTABLE_AGENTS,
  getArtifactData
} from './agent-executor.js';
import { createRouterFromEnv } from '@slate/llm-provider';

// Session persistence configuration from environment
const SESSION_PERSISTENCE_ENABLED = process.env.SLATE_SESSION_PERSISTENCE !== "false";
const SESSION_PERSISTENCE_DIR = process.env.SLATE_SESSION_DIR || "sessions";

// Session manager singleton with persistence
const sessionManager = new SessionManager({
  enabled: SESSION_PERSISTENCE_ENABLED,
  directory: SESSION_PERSISTENCE_DIR
});

// Initialize session manager (loads persisted sessions)
let sessionManagerInitialized = false;
async function ensureSessionManagerInit(): Promise<void> {
  if (!sessionManagerInitialized) {
    await sessionManager.init();
    sessionManagerInitialized = true;
  }
}

const rpcToken = process.env.SLATE_RPC_TOKEN?.trim();
const RESEARCH_AGENT = {
  agent_id: "research_agent",
  manifest: "tools/agents/resonant.yaml",
  behavioral_engine: "tools/agents/resonant_behavioral_engine.yaml",
  context_pipeline: "context/protocol/context_pipeline.yaml",
  context_packet_schema: "context/schemas/context_packet.schema.json"
};
const RESEARCH_KEYWORDS = [
  "ticket",
  "triage",
  "context",
  "enrich",
  "align",
  "resonant"
];

const KNOWN_AGENT_IDS = Object.keys(PERMISSION_MATRIX) as AgentId[];
const AUTONOMY_LEVELS: AutonomyLevel[] = ["L0", "L1", "L2", "L3"];
const KNOWN_PERMISSIONS: Permission[] = Array.from(
  new Set(
    Object.values(PERMISSION_MATRIX).flatMap((levelMap) =>
      Object.values(levelMap).flat()
    )
  )
) as Permission[];

let cachedCssCalculator: CSSCalculator | null = null;
let cachedCssConfigPath: string | null = null;

function resolveCssConfigPath(): string {
  const envPath = process.env.SLATE_CSS_CONFIG?.trim();
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (!existsSync(resolved)) {
      throw new Error(`CSS config not found at SLATE_CSS_CONFIG=${resolved}`);
    }
    return resolved;
  }

  const repoRoot = path.resolve(__dirname, "../../../../");
  const bundledConfig = path.resolve(repoRoot, "engines/basis/config/css_scoring.yaml");
  if (existsSync(bundledConfig)) {
    return bundledConfig;
  }
  const legacyConfig = path.resolve(repoRoot, "configs/css/css_scoring.yaml");
  if (existsSync(legacyConfig)) {
    return legacyConfig;
  }

  throw new Error(
    "CSS config path missing. Set SLATE_CSS_CONFIG to a css_scoring.yaml file, or keep the bundled engines/basis/config/css_scoring.yaml file."
  );
}

function getCssCalculator(): CSSCalculator {
  const configPath = resolveCssConfigPath();
  if (!cachedCssCalculator || cachedCssConfigPath !== configPath) {
    cachedCssCalculator = CSSCalculator.fromYamlFile(configPath);
    cachedCssConfigPath = configPath;
  }
  return cachedCssCalculator;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: any;
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: number | string | null;
  result: any;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

function makeError(id: JsonRpcRequest["id"], code: number, message: string, data?: any): JsonRpcError {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, data }
  };
}

function makeResult(id: JsonRpcRequest["id"], result: any): JsonRpcSuccess {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result
  };
}

function normalizeStateInput(input: unknown): RuntimeStateTag | null {
  if (typeof input !== "string") {
    return null;
  }

  if (isRuntimeState(input)) {
    return input;
  }

  const prefixed = `#state:${input}`;
  if (isRuntimeState(prefixed)) {
    return prefixed;
  }

  return null;
}

function normalizeStateNameOnly(input: unknown): RuntimeStateName | null {
  return normalizeStateName(input);
}

function normalizeTaskType(input: unknown): TaskType | null {
  if (input === 'complex_task') {
    return 'complex_task';
  }
  if (input === 'simple_task') {
    return 'simple_task';
  }
  return null;
}

function normalizeMode(input: unknown): Mode | null {
  if (input === 'quiet') {
    return 'quiet';
  }
  if (input === 'verbose') {
    return 'verbose';
  }
  return null;
}

function normalizeAutonomyLevelInput(input: unknown): AutonomyLevel | null {
  if (typeof input !== "string") {
    return null;
  }
  return AUTONOMY_LEVELS.includes(input as AutonomyLevel)
    ? (input as AutonomyLevel)
    : null;
}

function normalizeAgentIdInput(input: unknown): AgentId | null {
  if (typeof input !== "string") {
    return null;
  }
  return KNOWN_AGENT_IDS.includes(input as AgentId) ? (input as AgentId) : null;
}

function normalizePermissionInput(input: unknown): Permission | null {
  if (typeof input !== "string") {
    return null;
  }
  return KNOWN_PERMISSIONS.includes(input as Permission)
    ? (input as Permission)
    : null;
}

function sanitizeLimit(value: unknown, defaultValue: number, maxValue: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return defaultValue;
  }
  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return defaultValue;
  }
  return Math.min(normalized, maxValue);
}

function authorize(req: JsonRpcRequest): boolean {
  if (!rpcToken) {
    return true;
  }
  const params = req.params;
  if (!params || typeof params !== 'object') {
    return false;
  }
  if (params.token === rpcToken) {
    delete params.token;
    return true;
  }
  return false;
}

refreshSnippets();
appendLog({
  level: "info",
  category: "startup",
  message: "Slate MCP Runtime booted",
  data: { cwd: process.cwd() }
});
initHistory()
  .then(() => {
    const stats = historyStats();
    appendLog({
      level: 'info',
      category: 'startup',
      message: 'history initialized',
      data: stats
    });
  })
  .catch((error) => {
    appendLog({
      level: 'error',
      category: 'startup',
      message: 'history initialization failed',
      data: { error: error instanceof Error ? error.message : String(error) }
    });
  });

export async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  try {
    if (!authorize(req)) {
      return makeError(req.id, 401, 'Unauthorized');
    }
    switch (req.method) {
      case "slate.ping":
        return makeResult(req.id, { ok: true });

      case "slate.set_state": {
        const state = normalizeStateInput(req.params?.state);
        if (!state) {
          return makeError(req.id, 400, `Invalid state: ${state}`);
        }
        const snapshot = setRuntimeState(state, req.params?.reason, req.params?.metadata);
        appendLog({
          level: "info",
          category: "state",
          message: `set_state: state=${state}, reason=${req.params?.reason ?? 'n/a'}`
        });
        appendHistory({ type: 'state_change', state: snapshot, source: 'user' }).catch((error) => {
          appendLog({
            level: 'error',
            category: 'state',
            message: 'history append failed for state_change',
            data: { error: error instanceof Error ? error.message : String(error) }
          });
        });
        return makeResult(req.id, snapshot);
      }

      case "slate.get_state": {
        const snapshot = getRuntimeState();
        return makeResult(req.id, snapshot);
      }

      case "slate.list_snippets":
        return makeResult(req.id, listSnippets());

      case "slate.refresh_snippets": {
        refreshSnippets();
        return makeResult(req.id, { count: listSnippets().length });
      }

      case "slate.get_mode":
        return makeResult(req.id, { mode: getMode() });

      case "slate.set_mode": {
        const requested = normalizeMode(req.params?.mode);
        if (!requested) {
          return makeError(req.id, 400, `Invalid mode: ${req.params?.mode}`);
        }
        const mode = setMode(requested);
        appendLog({
          level: "info",
          category: "state",
          message: `set_mode: mode=${mode}`
        });
        appendHistory({ type: 'mode_change', mode, state: getRuntimeState(), source: 'user' }).catch((error) => {
          appendLog({
            level: 'error',
            category: 'state',
            message: 'history append failed for mode_change',
            data: { error: error instanceof Error ? error.message : String(error) }
          });
        });
        return makeResult(req.id, { mode });
      }

      case "slate.calculate_css": {
        const parseResult = ContextPayloadSchema.safeParse(req.params?.context);
        if (!parseResult.success) {
          return makeError(req.id, 400, "Invalid context payload", parseResult.error.flatten());
        }
        const payload: ContextPayload = parseResult.data;
        const runtimeMode: RuntimeMode =
          req.params?.runtimeMode === "dev" ? "dev" : "prod";
        try {
          const calculator = getCssCalculator();
          const result = calculator.computeCSS(payload, runtimeMode);
          appendLog({
            level: "info",
            category: "execution",
            message: `calculate_css: mode=${runtimeMode}, score=${result.score}`
          });
          return makeResult(req.id, result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          appendLog({
            level: "error",
            category: "execution",
            message: "calculate_css failed",
            data: { error: message }
          });
          return makeError(req.id, 500, "Failed to calculate CSS", { error: message });
        }
      }

      case "slate.decide_autonomy": {
        const stateName = normalizeStateNameOnly(req.params?.state);
        const taskType = normalizeTaskType(req.params?.taskType) ?? 'simple_task';
        if (!stateName) {
          return makeError(req.id, 400, `Invalid state: ${req.params?.state}`);
        }
        const result = decideAutonomy(stateName, taskType);
        appendLog({
          level: "info",
          category: "execution",
          message: `decide_autonomy: state=${stateName}, taskType=${taskType} -> level=${result.level}`
        });
        appendHistory({
          type: 'autonomy_decision',
          decision: result,
          state: getRuntimeState(),
          source: 'runtime'
        }).catch((error) => {
          appendLog({
            level: 'error',
            category: 'execution',
            message: 'history append failed for autonomy_decision',
            data: { error: error instanceof Error ? error.message : String(error) }
          });
        });
        return makeResult(req.id, result);
      }

      case "slate.enforce_perms": {
        const agent = normalizeAgentIdInput(req.params?.agent ?? req.params?.agent_id);
        if (!agent) {
          return makeError(req.id, 400, `Invalid agent: ${req.params?.agent ?? req.params?.agent_id}`);
        }

        const levelInput =
          req.params?.autonomyLevel ?? req.params?.autonomy_level ?? req.params?.level;
        const autonomyLevel = normalizeAutonomyLevelInput(levelInput);
        if (!autonomyLevel) {
          return makeError(req.id, 400, `Invalid autonomy level: ${levelInput}`);
        }

        const permissionRaw =
          req.params?.requestedPermission ??
          req.params?.requested_permission ??
          req.params?.permission ??
          req.params?.tool;
        const permission = normalizePermissionInput(permissionRaw);
        if (!permission) {
          return makeError(
            req.id,
            400,
            `Invalid permission: ${permissionRaw ?? "(missing)"}`
          );
        }

        const validation = validateAgentPermissions(agent, autonomyLevel, [permission]);
        if (!validation.valid) {
          const reason = `Permission "${permission}" denied for agent ${agent} at ${autonomyLevel}`;
          appendLog({
            level: "warn",
            category: "permissions",
            message: "enforce_perms: denied",
            data: { agent, autonomyLevel, permission, denied: validation.denied }
          });
          return makeResult(req.id, {
            allowed: false,
            reason
          });
        }

        appendLog({
          level: "info",
          category: "permissions",
          message: "enforce_perms: allowed",
          data: { agent, autonomyLevel, permission }
        });
        return makeResult(req.id, { allowed: true });
      }

      case 'slate.get_history': {
        const limit = sanitizeLimit(req.params?.limit, 20, 100);
        const type = req.params?.type as SlateHistoryEventType | undefined;
        if (type && !HISTORY_EVENT_TYPES_ARRAY.includes(type)) {
          return makeError(req.id, 400, `Invalid history type: ${type}`);
        }
        const events = getHistory(limit, type);
        return makeResult(req.id, events);
      }

      case 'slate.history_status': {
        return makeResult(req.id, getHistoryStatus());
      }

      case 'slate.rotate_history': {
        await rotateHistory();
        return makeResult(req.id, getHistoryStatus());
      }

      case "slate.get_snippet": {
        const snip = getSnippet(req.params?.id);
        if (!snip) {
          return makeError(req.id, 404, `Snippet not found: ${req.params?.id}`);
        }
        return makeResult(req.id, snip);
      }

      case "slate.get_logs": {
        const limit = sanitizeLimit(req.params?.limit, 50, 200);
        return makeResult(req.id, getLogs(limit));
      }

      case "slate.route_task": {
        const intent = String(req.params?.intent ?? "").toLowerCase();
        const matchesResearch = RESEARCH_KEYWORDS.some((keyword) => intent.includes(keyword));
        if (!matchesResearch) {
          return makeError(req.id, 422, `No routing rule for intent: ${intent || '(empty)'}`);
        }
        const title = req.params?.title ?? "Ticket triage";
        const description = req.params?.description ?? "";
        const contextSources = Array.isArray(req.params?.context_sources) ? req.params.context_sources : [];
        const packet = {
          origin: "Decide.Command.simple_task",
          command: "research_agent.context_packet.brief",
          options: {
            voice: "quiet",
            format: "markdown",
            autonomy: "L0"
          },
          input: {
            title,
            description,
            context_sources: contextSources
          }
        };
        appendLog({
          level: "info",
          category: "routing",
          message: `route_task -> research_agent (${intent})`
        });
        return makeResult(req.id, {
          agent: RESEARCH_AGENT,
          packet
        });
      }

      // ========== Worktree Management ==========

      case "slate.create_worktree": {
        const taskId = req.params?.task_id;
        try {
          // Pre-check git environment for better error messages
          const gitEnv = checkGitEnvironment();
          if (!gitEnv.available || !gitEnv.inRepo) {
            return makeError(
              req.id,
              503,
              gitEnv.error || "Git environment not ready for worktree operations. Call slate.check_git for details."
            );
          }

          const worktree = createWorktree(taskId);
          appendLog({
            level: "info",
            category: "worktree",
            message: `create_worktree: id=${worktree.id}, path=${worktree.path}`
          });
          return makeResult(req.id, worktree);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          appendLog({
            level: "error",
            category: "worktree",
            message: `create_worktree failed: ${errorMessage}`
          });
          return makeError(req.id, 500, `Failed to create worktree: ${errorMessage}`);
        }
      }

      case "slate.get_worktree": {
        const worktreeId = req.params?.worktree_id;
        if (!worktreeId) {
          return makeError(req.id, 400, "Missing worktree_id");
        }
        const worktree = getWorktree(worktreeId);
        if (!worktree) {
          return makeError(req.id, 404, `Worktree not found: ${worktreeId}`);
        }
        return makeResult(req.id, worktree);
      }

      case "slate.list_worktrees": {
        const worktrees = listWorktrees();
        return makeResult(req.id, worktrees);
      }

      case "slate.check_git": {
        // Diagnostic endpoint to check git availability and repository status
        const forceRefresh = req.params?.refresh === true;
        const gitEnv = checkGitEnvironment(forceRefresh);
        return makeResult(req.id, {
          available: gitEnv.available,
          version: gitEnv.version,
          in_repository: gitEnv.inRepo,
          repository_root: gitEnv.repoRoot,
          error: gitEnv.error,
          worktree_capable: gitEnv.available && gitEnv.inRepo
        });
      }

      case "slate.llm_status": {
        // Diagnostic endpoint to check LLM provider availability
        const router = createRouterFromEnv();
        const status = router.getStatus();
        return makeResult(req.id, {
          primary_provider: status.primary,
          fallback_provider: status.fallback ?? null,
          available_providers: status.availableProviders,
          ready: status.availableProviders.length > 0,
          last_error: status.lastError ?? null
        });
      }

      case "slate.cleanup_worktree": {
        const worktreeId = req.params?.worktree_id;
        if (!worktreeId) {
          return makeError(req.id, 400, "Missing worktree_id");
        }
        const result = cleanupWorktree(worktreeId);
        if (!result.success) {
          return makeError(req.id, 404, result.error ?? "Cleanup failed");
        }
        appendLog({
          level: "info",
          category: "worktree",
          message: `cleanup_worktree: id=${worktreeId}`
        });
        return makeResult(req.id, { success: true, worktree_id: worktreeId });
      }

      // ========== Artifact Management ==========

      case "slate.register_artifact": {
        const type = req.params?.type as ArtifactType;
        const data = req.params?.data;
        const sourceAgent = req.params?.source_agent ?? "unknown";
        const sessionId = req.params?.session_id;

        if (!type || !data) {
          return makeError(req.id, 400, "Missing type or data");
        }

        const result = registerArtifact(type, data, sourceAgent, sessionId);
        if (!result.success) {
          return makeError(req.id, 400, `Validation failed: ${result.errors?.join(", ")}`);
        }

        appendLog({
          level: "info",
          category: "artifact",
          message: `register_artifact: type=${type}, id=${result.artifact?.id}`
        });
        return makeResult(req.id, result.artifact);
      }

      case "slate.query_artifacts": {
        const filter = {
          type: req.params?.type as ArtifactType | undefined,
          source_agent: req.params?.source_agent,
          session_id: req.params?.session_id,
          limit: sanitizeLimit(req.params?.limit, 20, 100)
        };
        const artifacts = queryArtifacts(filter);
        return makeResult(req.id, artifacts);
      }

      case "slate.get_artifact": {
        const artifactId = req.params?.artifact_id;
        if (!artifactId) {
          return makeError(req.id, 400, "Missing artifact_id");
        }
        // Check registered artifacts first, then agent execution artifacts
        const artifact = getArtifact(artifactId) || getArtifactData(artifactId);
        if (!artifact) {
          return makeError(req.id, 404, `Artifact not found: ${artifactId}`);
        }
        return makeResult(req.id, artifact);
      }

      case "slate.get_artifact_chain": {
        const artifactId = req.params?.artifact_id;
        if (!artifactId) {
          return makeError(req.id, 400, "Missing artifact_id");
        }
        const chain = getArtifactChain(artifactId);
        return makeResult(req.id, chain);
      }

      // ========== Merge Gating ==========

      case "slate.gate_merge": {
        const worktreeId = req.params?.worktree_id;
        const shipDecisionId = req.params?.ship_decision_id;

        if (!worktreeId || !shipDecisionId) {
          return makeError(req.id, 400, "Missing worktree_id or ship_decision_id");
        }

        // Verify ShipDecision exists and is "ship"
        const shipDecision = getArtifact(shipDecisionId);
        if (!shipDecision) {
          return makeError(req.id, 404, `ShipDecision not found: ${shipDecisionId}`);
        }
        if (shipDecision.type !== "shipDecision") {
          return makeError(req.id, 400, `Artifact is not a ShipDecision: ${shipDecisionId}`);
        }

        const decision = (shipDecision.data as { decision: string }).decision;
        if (decision !== "ship") {
          return makeError(req.id, 403, `Cannot merge: ShipDecision is "${decision}", not "ship"`);
        }

        // Mark worktree as merged
        const marked = markWorktreeMerged(worktreeId);
        if (!marked) {
          return makeError(req.id, 404, `Worktree not found: ${worktreeId}`);
        }

        appendLog({
          level: "info",
          category: "merge",
          message: `gate_merge: approved for worktree=${worktreeId}, decision=${shipDecisionId}`
        });

        return makeResult(req.id, {
          approved: true,
          worktree_id: worktreeId,
          ship_decision_id: shipDecisionId
        });
      }

      // ========== Session Management ==========

      case "slate.create_session": {
        await ensureSessionManagerInit();

        const goal = req.params?.goal;
        const context = req.params?.context;
        const autonomyLevel = req.params?.autonomy_level as AutonomyLevel | undefined;

        if (!goal) {
          return makeError(req.id, 400, "Missing goal");
        }
        if (!autonomyLevel || !AUTONOMY_LEVELS.includes(autonomyLevel)) {
          return makeError(req.id, 400, `Invalid autonomy_level: ${autonomyLevel}`);
        }

        const config: SessionConfig = {
          goal,
          context: context || { questions: {}, decision_matrix: {} },
          autonomyLevel
        };

        const session = await sessionManager.create(config);
        appendLog({
          level: "info",
          category: "session",
          message: `create_session: id=${session.id}, goal="${goal.substring(0, 50)}..."`
        });

        return makeResult(req.id, session.getMetadata());
      }

      case "slate.get_session": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        return makeResult(req.id, {
          metadata: session.getMetadata(),
          artifacts: session.getAllArtifacts()
        });
      }

      case "slate.list_sessions": {
        await ensureSessionManagerInit();
        const sessions = sessionManager.list();
        return makeResult(req.id, sessions);
      }

      case "slate.session_status": {
        // Get persistence status for sessions
        const status = sessionManager.getStatus();
        return makeResult(req.id, status);
      }

      case "slate.start_session": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        try {
          session.start();
          await sessionManager.saveSession(sessionId);
          appendLog({
            level: "info",
            category: "session",
            message: `start_session: id=${sessionId}, step=${session.currentStep}`
          });
          return makeResult(req.id, session.getMetadata());
        } catch (error) {
          return makeError(req.id, 400, error instanceof Error ? error.message : String(error));
        }
      }

      case "slate.advance_session": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        const nextStep = req.params?.next_step;

        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }
        if (!nextStep) {
          return makeError(req.id, 400, "Missing next_step");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        try {
          session.advanceTo(nextStep);
          await sessionManager.saveSession(sessionId);
          appendLog({
            level: "info",
            category: "session",
            message: `advance_session: id=${sessionId}, step=${nextStep}`
          });
          return makeResult(req.id, session.getMetadata());
        } catch (error) {
          return makeError(req.id, 400, error instanceof Error ? error.message : String(error));
        }
      }

      case "slate.complete_session": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        session.complete();
        await sessionManager.saveSession(sessionId);
        appendLog({
          level: "info",
          category: "session",
          message: `complete_session: id=${sessionId}`
        });
        return makeResult(req.id, session.getMetadata());
      }

      case "slate.fail_session": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        const error = req.params?.error;

        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        session.fail(error || "Unknown error");
        await sessionManager.saveSession(sessionId);
        appendLog({
          level: "warn",
          category: "session",
          message: `fail_session: id=${sessionId}, error="${error}"`
        });
        return makeResult(req.id, session.getMetadata());
      }

      case "slate.get_session_artifact": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        const artifactId = req.params?.artifact_id;

        if (!sessionId || !artifactId) {
          return makeError(req.id, 400, "Missing session_id or artifact_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        const artifact = session.getArtifact(artifactId);
        if (!artifact) {
          return makeError(req.id, 404, `Artifact not found: ${artifactId}`);
        }

        return makeResult(req.id, artifact);
      }

      case "slate.get_session_lineage": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        const artifactId = req.params?.artifact_id;

        if (!sessionId || !artifactId) {
          return makeError(req.id, 400, "Missing session_id or artifact_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        const lineage = session.getLineage(artifactId);
        return makeResult(req.id, lineage);
      }

      case "slate.store_session_artifact": {
        await ensureSessionManagerInit();

        const sessionId = req.params?.session_id;
        const artifactType = req.params?.artifact_type;
        const artifactData = req.params?.data;
        const agentId = req.params?.agent_id;
        const parentId = req.params?.parent_id;

        if (!sessionId || !artifactType || !artifactData || !agentId) {
          return makeError(req.id, 400, "Missing session_id, artifact_type, data, or agent_id");
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        const artifact = session.storeArtifact(artifactType, artifactData, agentId, parentId);
        await sessionManager.saveSession(sessionId);

        appendLog({
          level: "info",
          category: "session",
          message: `store_session_artifact: session=${sessionId}, artifact=${artifact.id}, type=${artifactType}`
        });

        return makeResult(req.id, artifact);
      }

      // Agent Execution Methods (for external AI runners)
      case "slate.run_agent": {
        const agentId = req.params?.agent_id;
        const sessionId = req.params?.session_id;
        const autonomyLevel = req.params?.autonomy_level;
        const input = req.params?.input || {};
        const timeout = req.params?.timeout;

        if (!agentId) {
          return makeError(req.id, 400, "Missing agent_id");
        }
        if (!isExecutableAgent(agentId)) {
          return makeError(req.id, 400, `Invalid agent_id: ${agentId}. Valid agents: ${EXECUTABLE_AGENTS.join(", ")}`);
        }
        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }
        if (!autonomyLevel || !AUTONOMY_LEVELS.includes(autonomyLevel)) {
          return makeError(req.id, 400, `Invalid autonomy_level: ${autonomyLevel}. Valid levels: ${AUTONOMY_LEVELS.join(", ")}`);
        }

        const session = sessionManager.get(sessionId);
        if (!session) {
          return makeError(req.id, 404, `Session not found: ${sessionId}`);
        }

        const result = startAgentExecution({
          agentId,
          sessionId,
          autonomyLevel,
          input,
          timeout
        });

        appendLog({
          level: "info",
          category: "agent",
          message: `slate.run_agent: ${agentId}`,
          data: { executionId: result.executionId, sessionId }
        });

        return makeResult(req.id, result);
      }

      case "slate.get_agent_status": {
        const executionId = req.params?.execution_id;

        if (!executionId) {
          return makeError(req.id, 400, "Missing execution_id");
        }

        const status = getAgentExecutionStatus(executionId);
        if (!status) {
          return makeError(req.id, 404, `Execution not found: ${executionId}`);
        }

        return makeResult(req.id, status);
      }

      case "slate.list_agent_executions": {
        const sessionId = req.params?.session_id;

        if (!sessionId) {
          return makeError(req.id, 400, "Missing session_id");
        }

        const executions = listSessionExecutions(sessionId);
        return makeResult(req.id, { executions, count: executions.length });
      }

      default:
        appendLog({
          level: "warn",
          category: "execution",
          message: `Unknown method: ${req.method}`
        });
        return makeError(req.id, 404, `Unknown method: ${req.method}`);
    }
  } catch (err: any) {
    return makeError(req.id, 500, "Internal error", { message: err.message ?? String(err) });
  }
}

process.stdin.setEncoding("utf8");

let buffer = "";

process.stdin.on("data", async (chunk: string) => {
  buffer += chunk;
  let index: number;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;

    let req: JsonRpcRequest;
    try {
      req = JSON.parse(line);
    } catch (err: any) {
      const resp = makeError(undefined, -32700, "Parse error", { input: line });
      process.stdout.write(JSON.stringify(resp) + "\n");
      continue;
    }

    const resp = await handleRequest(req);
    process.stdout.write(JSON.stringify(resp) + "\n");
  }
});
