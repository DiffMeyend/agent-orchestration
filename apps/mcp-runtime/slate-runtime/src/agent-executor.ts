/**
 * Agent Executor
 *
 * Automated agent execution for MCP transport.
 * Allows external AI runners (Codex, ChatGPT) to invoke SLATE agents.
 */

import type { AgentId, AutonomyLevel } from "@slate/context-schema";
import { appendLog } from "./logs.js";
import * as fs from "node:fs";
import * as path from "node:path";

// Path to context packets directory (relative to repo root)
const CONTEXT_PACKETS_DIR = path.resolve(process.cwd(), "context/context_packets");

/**
 * Persist artifact to context/context_packets/ as JSON
 */
function persistArtifact(artifactId: string, artifactType: string, data: unknown): void {
  try {
    // Ensure directory exists
    if (!fs.existsSync(CONTEXT_PACKETS_DIR)) {
      fs.mkdirSync(CONTEXT_PACKETS_DIR, { recursive: true });
    }

    // Generate filename: {type}-{timestamp}.json
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const typeSlug = artifactType.toLowerCase().replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const filename = `${typeSlug}-${timestamp}-${artifactId.slice(-6)}.json`;
    const filepath = path.join(CONTEXT_PACKETS_DIR, filename);

    // Write JSON with pretty formatting
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");

    appendLog({
      level: "info",
      category: "artifact",
      message: `Persisted artifact to ${filename}`,
      data: { artifactId, artifactType, filepath }
    });
  } catch (err) {
    appendLog({
      level: "warn",
      category: "artifact",
      message: `Failed to persist artifact: ${err instanceof Error ? err.message : String(err)}`,
      data: { artifactId, artifactType }
    });
  }
}

/**
 * Agent execution request
 */
export interface AgentExecutionRequest {
  agentId: AgentId;
  sessionId: string;
  autonomyLevel: AutonomyLevel;
  input: Record<string, unknown>;
  timeout?: number;
}

/**
 * Agent execution status
 */
export type AgentStatus = "pending" | "running" | "completed" | "failed" | "timeout";

/**
 * Agent execution result
 */
export interface AgentArtifactSummary {
  id: string;
  type: string;
  role?: string;
}

export interface AgentExecutionResult {
  executionId: string;
  agentId: AgentId;
  sessionId: string;
  status: AgentStatus;
  startedAt: string;
  completedAt?: string;
  artifact?: AgentArtifactSummary;
  artifacts?: AgentArtifactSummary[];
  error?: string;
  duration?: number;
}

// In-memory execution tracking
const executions = new Map<string, AgentExecutionResult>();

/**
 * Generate execution ID
 */
function generateExecutionId(): string {
  const date = new Date().toISOString().split("T")[0];
  const random = Math.random().toString(36).substring(2, 8);
  return `exec-${date}-${random}`;
}

/**
 * Start agent execution
 *
 * Note: This is a placeholder for actual agent invocation.
 * In production, this would:
 * 1. Import the agent runner dynamically
 * 2. Execute with proper permission checks
 * 3. Store artifacts via session manager
 */
export function startAgentExecution(request: AgentExecutionRequest): AgentExecutionResult {
  const executionId = generateExecutionId();

  const result: AgentExecutionResult = {
    executionId,
    agentId: request.agentId,
    sessionId: request.sessionId,
    status: "pending",
    startedAt: new Date().toISOString()
  };

  executions.set(executionId, result);

  appendLog({
    level: "info",
    category: "agent",
    message: `Agent execution started: ${request.agentId}`,
    data: { executionId, sessionId: request.sessionId, autonomyLevel: request.autonomyLevel }
  });

  // Mark as running (actual execution would be async)
  result.status = "running";

  // Execute the actual agent runner asynchronously
  executeAgent(executionId, request).catch((err) => {
    const exec = executions.get(executionId);
    if (exec) {
      exec.status = "failed";
      exec.error = err.message || String(err);
      exec.completedAt = new Date().toISOString();
    }
  });

  return result;
}

/**
 * Execute agent and return result
 */
async function executeAgent(
  executionId: string,
  request: AgentExecutionRequest
): Promise<void> {
  const exec = executions.get(executionId);
  if (!exec) return;

  const startTime = Date.now();

  try {
    let result:
      | { success: true; artifact?: { id: string } }
      | { success: true; shipDecision?: { id: string }; releaseNotes?: { id: string } }
      | { success: false; errors?: string[] };
    const capturedArtifacts: Array<{ id: string; type: string; role?: string; data: unknown }> = [];

    // Dynamically import and run the appropriate agent
    switch (request.agentId) {
      case "polymath": {
        const { run } = await import("@slate/polymath");
        const polymathInput = {
          context: request.input.context || { questions: {}, decision_matrix: {} },
          goal: request.input.goal as string || "Explore the problem space",
          constraints: request.input.constraints as string[] | undefined
        };
        result = await run(polymathInput, {
          autonomyLevel: request.autonomyLevel,
          sessionId: request.sessionId,
          llmConfig: request.input.llmConfig as Record<string, unknown> | undefined
        });
        if (result.success && result.artifact) {
          capturedArtifacts.push({
            id: result.artifact.id,
            type: "TaskMap",
            data: result.artifact
          });
        }
        break;
      }
      case "resonant": {
        const { run } = await import("@slate/resonant");
        const resonantInput = {
          context: request.input.context || { questions: {}, decision_matrix: {} },
          taskMap: request.input.taskMap,
          focusAreas: request.input.focusAreas as string[] | undefined
        };
        result = await run(resonantInput, {
          autonomyLevel: request.autonomyLevel,
          sessionId: request.sessionId,
          llmConfig: request.input.llmConfig as Record<string, unknown> | undefined
        });
        if (result.success && result.artifact) {
          capturedArtifacts.push({
            id: result.artifact.id,
            type: "EvidencePack",
            data: result.artifact
          });
        }
        break;
      }
      case "architect": {
        const { run } = await import("@slate/architect");
        result = await run(request.input as Record<string, unknown>, {
          autonomyLevel: request.autonomyLevel,
          sessionId: request.sessionId
        } as Record<string, unknown>);
        if (result.success && result.artifact) {
          capturedArtifacts.push({
            id: result.artifact.id,
            type: "DesignSpec",
            data: result.artifact
          });
        }
        break;
      }
      case "executor": {
        const { run } = await import("@slate/executor");
        result = await run(request.input as Record<string, unknown>, {
          autonomyLevel: request.autonomyLevel,
          sessionId: request.sessionId,
          timeout: request.timeout
        } as Record<string, unknown>);
        if (result.success && result.artifact) {
          capturedArtifacts.push({
            id: result.artifact.id,
            type: "PatchSet",
            data: result.artifact
          });
        }
        break;
      }
      case "horizon": {
        const { run } = await import("@slate/horizon");
        result = await run(request.input as Record<string, unknown>, {
          autonomyLevel: request.autonomyLevel,
          sessionId: request.sessionId
        } as Record<string, unknown>);
        if (result.success && result.shipDecision) {
          capturedArtifacts.push({
            id: result.shipDecision.id,
            type: "ShipDecision",
            role: "shipDecision",
            data: result.shipDecision
          });
        }
        if (result.success && result.releaseNotes) {
          capturedArtifacts.push({
            id: result.releaseNotes.id,
            type: "ReleaseNotes",
            role: "releaseNotes",
            data: result.releaseNotes
          });
        }
        break;
      }
      case "alchemist": {
        const { run } = await import("@slate/alchemist");
        result = await run(request.input as Record<string, unknown>, {
          autonomyLevel: request.autonomyLevel,
          sessionId: request.sessionId
        } as Record<string, unknown>);
        if (result.success && result.artifact) {
          capturedArtifacts.push({
            id: result.artifact.id,
            type: "OptionsSet",
            data: result.artifact
          });
        }
        break;
      }
      default:
        // For agents not yet wired up, return placeholder
        result = {
          success: true,
          artifact: { id: `artifact-${executionId}`, type: getArtifactTypeForAgent(request.agentId) }
        };
        capturedArtifacts.push({
          id: `artifact-${executionId}`,
          type: getArtifactTypeForAgent(request.agentId),
          data: result.artifact
        });
        appendLog({
          level: "warn",
          category: "agent",
          message: `Agent ${request.agentId} not yet implemented - using placeholder`,
          data: { executionId }
        });
    }

    exec.completedAt = new Date().toISOString();
    exec.duration = Date.now() - startTime;

    if (result.success && capturedArtifacts.length > 0) {
      exec.status = "completed";
      exec.artifact = {
        id: capturedArtifacts[0].id,
        type: capturedArtifacts[0].type,
        role: capturedArtifacts[0].role
      };
      exec.artifacts = capturedArtifacts.map(({ id, type, role }) => ({
        id,
        type,
        role
      }));
      // Store actual artifact data for retrieval and persist to disk
      for (const artifact of capturedArtifacts) {
        artifactData.set(artifact.id, artifact.data);
        persistArtifact(artifact.id, artifact.type, artifact.data);
      }

      appendLog({
        level: "info",
        category: "agent",
        message: `Agent execution completed: ${request.agentId}`,
        data: {
          executionId,
          duration: exec.duration,
          artifacts: capturedArtifacts.map((artifact) => artifact.id)
        }
      });
    } else {
      exec.status = "failed";
      exec.error = result.errors?.join("; ") || "Agent returned unsuccessful result";

      appendLog({
        level: "error",
        category: "agent",
        message: `Agent execution failed: ${request.agentId}`,
        data: { executionId, error: exec.error }
      });
    }
  } catch (err) {
    exec.status = "failed";
    exec.error = err instanceof Error ? err.message : String(err);
    exec.completedAt = new Date().toISOString();
    exec.duration = Date.now() - startTime;

    appendLog({
      level: "error",
      category: "agent",
      message: `Agent execution error: ${request.agentId}`,
      data: { executionId, error: exec.error }
    });
  }
}

// In-memory artifact data storage
const artifactData = new Map<string, unknown>();

/**
 * Get artifact data by ID
 */
export function getArtifactData(artifactId: string): unknown | undefined {
  return artifactData.get(artifactId);
}

/**
 * Get artifact type for agent
 */
function getArtifactTypeForAgent(agentId: AgentId): string {
  const artifactMap: Record<AgentId, string> = {
    polymath: "TaskMap",
    resonant: "EvidencePack",
    architect: "DesignSpec",
    executor: "PatchSet",
    horizon: "ShipDecision",
    alchemist: "OptionsSet"
  };
  return artifactMap[agentId] || "Unknown";
}

/**
 * Get agent execution status
 */
export function getAgentExecutionStatus(executionId: string): AgentExecutionResult | undefined {
  return executions.get(executionId);
}

/**
 * List all executions for a session
 */
export function listSessionExecutions(sessionId: string): AgentExecutionResult[] {
  return Array.from(executions.values()).filter(
    (exec) => exec.sessionId === sessionId
  );
}

/**
 * Clear completed executions (cleanup)
 */
export function clearCompletedExecutions(): number {
  let cleared = 0;
  for (const [id, exec] of executions) {
    if (exec.status === "completed" || exec.status === "failed") {
      executions.delete(id);
      cleared++;
    }
  }
  return cleared;
}

/**
 * Valid agent IDs for execution
 */
export const EXECUTABLE_AGENTS: AgentId[] = [
  "polymath",
  "resonant",
  "architect",
  "executor",
  "horizon",
  "alchemist"
];

/**
 * Check if agent ID is valid for execution
 */
export function isExecutableAgent(agentId: string): agentId is AgentId {
  return EXECUTABLE_AGENTS.includes(agentId as AgentId);
}
