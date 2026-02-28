import { describe, expect, it } from "vitest";
import { CSSCalculator, type CSSConfig } from "./css-calculator.js";

const baseConfig: CSSConfig = {
  version: "test",
  target_css: 100,
  css_gates: {
    tier_a: 90,
    tier_b: 75,
    tier_c: 60
  },
  required_evidence_for_css_ge_90: {
    must_have: [{ path: "context.details", op: "not_null" }]
  },
  domains: {
    comprehension: { weight: 60, description: "Context clarity" },
    delivery: { weight: 40, description: "Execution readiness" }
  },
  domain_rules: {
    comprehension: {
      confirmed: {
        all: [{ path: "context.details", op: "not_null" }]
      }
    },
    delivery: {
      partial: {
        any: [{ path: "tests.count", op: "len_ge", value: 1 }]
      }
    }
  },
  hard_caps: [
    {
      id: "missing_context",
      condition: { all: [{ path: "context.details", op: "is_null" }] },
      cap: 50,
      reason: "No context available"
    }
  ]
};

const calculator = new CSSCalculator(baseConfig);

const validPayload = {
  context: {
    details: "Grounded",
    extra: true
  },
  tests: {
    count: ["lint"]
  }
};

describe("CSSCalculator", () => {
  it("scores confirmed and partial domains", () => {
    const result = calculator.computeCSS(validPayload);
    expect(result.score).toBe(80); // confirmed (60) + partial (20)
    expect(result.domain_scores?.comprehension.score).toBe(60);
    expect(result.domain_scores?.delivery.score).toBe(20);
  });

  it("applies hard caps when must-haves missing", () => {
    const payload = { context: { details: null } };
    const result = calculator.computeCSS(payload);
    expect(result.score).toBe(50);
    expect(result.reason).toBe("must_have_requirements_not_met");
    expect(result.missing_fields).toContain("context.details");
  });
});
