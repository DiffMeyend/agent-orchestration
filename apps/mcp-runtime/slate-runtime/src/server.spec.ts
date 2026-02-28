import { describe, it, expect } from "vitest";
import type { ContextPayload } from "@slate/context-schema";
import { handleRequest } from "./server.js";

const BASE_PAYLOAD: ContextPayload = {
  id: "ctx-test",
  version: 1,
  confidence_score: 0.65,
  questions: {
    q1_actors: { humans: ["user"], systems: ["service"], vendors: [], confidence: 0.7 },
    q2_motivation: { stated_goal: "Restore access", underlying_need: "User productive", confidence: 0.7 },
    q3_constraints: { technical: ["Legacy VPN"], policy: [], resource: [], confidence: 0.6 },
    q4_bounds: { deadline: "EOD", sla: "4h", window: "Business hours", confidence: 0.6 },
    q5_semiotics: { codes_used: ["error 42"], interpretations: [], confidence: 0.5 },
    q6_temporality: { when_started: "2026-02-08T08:00:00Z", pattern: "Intermittent", frequency: "Hourly", confidence: 0.5 },
    q7_location: { physical: "Remote", logical: "VPN", organizational: "IT", confidence: 0.6 },
    q8_environment: { parent_system: "MindOS", adjacent_systems: ["M365"], confidence: 0.6 },
    q9_frame: { perspective: "User", mental_model: "Access blocked", confidence: 0.6 },
    q10_anchors: { baseline: "VPN stable", reference_point: "Last week", confidence: 0.6 }
  },
  decision_matrix: {
    options: [
      { id: "a", description: "Recreate VPN profile" },
      { id: "b", description: "Escalate to networking" }
    ],
    constraints: ["User in meeting"],
    recommendation: { option: "a", confidence: "medium", rationale: "Quick fix" }
  },
  metadata: {
    created_at: "2026-02-08T09:00:00.000Z",
    updated_at: "2026-02-08T10:00:00.000Z",
    staleness_decay: 0.5
  }
};

describe("Slate MCP Runtime handleRequest", () => {
  it("calculates CSS for a valid payload", async () => {
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "slate.calculate_css",
      params: { context: BASE_PAYLOAD, runtimeMode: "prod" }
    });

    expect("result" in response).toBe(true);
    if ("result" in response) {
      expect(response.result.score).toBeGreaterThanOrEqual(0);
      expect(response.result).toHaveProperty("target");
    }
  });

  it("denies forbidden permissions", async () => {
    const response = await handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "slate.enforce_perms",
      params: {
        agent: "executor",
        autonomyLevel: "L0",
        requestedPermission: "write_files_in_worktree"
      }
    });

    expect("result" in response).toBe(true);
    if ("result" in response) {
      expect(response.result.allowed).toBe(false);
    }
  });
});
