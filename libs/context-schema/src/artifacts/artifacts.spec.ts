import { describe, it, expect } from "vitest";
import {
  TaskMapSchema,
  EvidencePackSchema,
  DesignSpecSchema,
  OptionsSetSchema,
  PatchSetSchema,
  ShipDecisionSchema,
  ReleaseNotesSchema,
  ContextPayloadSchema
} from "./index.js";

const iso = () => new Date().toISOString();

const baseTaskMap = {
  id: "tm-1",
  created_at: iso(),
  goal: "Map unknowns",
  assumptions: ["one"],
  unknowns: ["two"],
  options: [
    {
      id: "opt-a",
      description: "Try something",
      pros: ["fast"],
      cons: ["risky"]
    }
  ],
  quick_checks: ["ping"],
  recommended_next: "collect evidence"
};

const baseEvidencePack = {
  id: "ep-1",
  created_at: iso(),
  task_map_ref: baseTaskMap.id,
  facts: [
    { claim: "Fact", source: "Doc", confidence: 0.9 }
  ],
  risks: [
    { description: "Risk", severity: "medium", mitigation: "Mitigate" }
  ],
  constraints: [
    { type: "technical", description: "Constraint" }
  ],
  values_alignment: [
    { value: "Autonomy", alignment: "aligned", notes: "note" }
  ],
  recommendation: "Move ahead"
};

const baseDesignSpec = {
  id: "ds-1",
  created_at: iso(),
  evidence_pack_ref: baseEvidencePack.id,
  scope: "Implement feature",
  non_goals: ["Refactor"],
  interfaces: [
    {
      name: "API",
      inputs: ["req"],
      outputs: ["res"],
      contract: "returns"
    }
  ],
  files_to_touch: ["src/app.ts"],
  acceptance_criteria: [
    { id: "ac1", description: "works", verification: "test" }
  ],
  test_plan: "Run tests",
  rollback_plan: "Revert"
};

const baseOptionsSet = {
  id: "os-1",
  created_at: iso(),
  design_spec_ref: baseDesignSpec.id,
  trigger: "stuck" as const,
  options: [
    {
      option_id: "alt",
      reframe: "New lens",
      approach: "Spike",
      preserves: ["goal"],
      risks: ["delay"],
      value_add: "learning"
    }
  ],
  safe_default: "Do nothing"
};

const basePatchSet = {
  id: "ps-1",
  created_at: iso(),
  design_spec_ref: baseDesignSpec.id,
  options_set_ref: baseOptionsSet.id,
  worktree: ".worktrees/abc",
  branch: "executor/abc",
  diff_summary: "+1 -0",
  files_changed: ["src/app.ts"],
  commands_run: [
    { command: "npm test", exit_code: 0, stdout: "ok", stderr: "" }
  ],
  test_results: [
    { suite: "unit", passed: 10, failed: 0, skipped: 0, details: "" }
  ],
  how_to_verify: "Run npm test"
};

const baseShipDecision = {
  id: "sd-1",
  created_at: iso(),
  patch_set_ref: basePatchSet.id,
  decision: "ship" as const,
  rationale: "Looks good",
  blocking_issues: [],
  followups: ["monitor"],
  anti_patterns_detected: []
};

const baseReleaseNotes = {
  id: "rn-1",
  ship_decision_ref: baseShipDecision.id,
  summary: "Shipped",
  changes: ["feature"],
  breaking_changes: [],
  migration_steps: []
};

const confidenceOnly = (value = 0.8) => ({ confidence: value });

const baseContextPayload = {
  id: "cp-1",
  version: 1,
  confidence_score: 0.7,
  questions: {
    q1_actors: confidenceOnly(),
    q2_motivation: confidenceOnly(),
    q3_constraints: confidenceOnly(),
    q4_bounds: confidenceOnly(),
    q5_semiotics: confidenceOnly(),
    q6_temporality: confidenceOnly(),
    q7_location: confidenceOnly(),
    q8_environment: confidenceOnly(),
    q9_frame: confidenceOnly(),
    q10_anchors: confidenceOnly()
  },
  decision_matrix: {
    options: [{ id: "opt", description: "ship" }],
    constraints: ["time"],
    recommendation: {
      option: "opt",
      confidence: "medium" as const,
      rationale: "meets goals"
    }
  },
  metadata: {
    created_at: iso(),
    updated_at: iso(),
    staleness_decay: 0.1
  }
};

describe("Artifact schemas", () => {
  it("validates TaskMap", () => {
    expect(() => TaskMapSchema.parse(baseTaskMap)).not.toThrow();
    expect(() => TaskMapSchema.parse({ ...baseTaskMap, goal: undefined as any })).toThrow();
  });

  it("validates EvidencePack", () => {
    expect(() => EvidencePackSchema.parse(baseEvidencePack)).not.toThrow();
    expect(() => EvidencePackSchema.parse({ ...baseEvidencePack, facts: [] })).not.toThrow();
    expect(() => EvidencePackSchema.parse({ ...baseEvidencePack, recommendation: undefined as any })).toThrow();
  });

  it("validates DesignSpec", () => {
    expect(() => DesignSpecSchema.parse(baseDesignSpec)).not.toThrow();
    expect(() => DesignSpecSchema.parse({ ...baseDesignSpec, id: 123 as any })).toThrow();
  });

  it("validates OptionsSet", () => {
    expect(() => OptionsSetSchema.parse(baseOptionsSet)).not.toThrow();
    expect(() => OptionsSetSchema.parse({ ...baseOptionsSet, options: [] })).not.toThrow();
    expect(() => OptionsSetSchema.parse({ ...baseOptionsSet, trigger: "unknown" as any })).toThrow();
  });

  it("validates PatchSet", () => {
    expect(() => PatchSetSchema.parse(basePatchSet)).not.toThrow();
    expect(() => PatchSetSchema.parse({ ...basePatchSet, commands_run: [] })).not.toThrow();
    expect(() => PatchSetSchema.parse({ ...basePatchSet, branch: null as any })).toThrow();
  });

  it("validates ShipDecision & ReleaseNotes", () => {
    expect(() => ShipDecisionSchema.parse(baseShipDecision)).not.toThrow();
    expect(() => ShipDecisionSchema.parse({ ...baseShipDecision, decision: "invalid" as any })).toThrow();
    expect(() => ReleaseNotesSchema.parse(baseReleaseNotes)).not.toThrow();
    expect(() => ReleaseNotesSchema.parse({ ...baseReleaseNotes, changes: "oops" as any })).toThrow();
  });

  it("validates ContextPayload", () => {
    expect(() => ContextPayloadSchema.parse(baseContextPayload)).not.toThrow();
    const invalid = { ...baseContextPayload, confidence_score: 2 };
    expect(() => ContextPayloadSchema.parse(invalid)).toThrow();
  });
});
