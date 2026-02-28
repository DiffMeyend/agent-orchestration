/**
 * CSS (Context Stability Score) Calculator
 * Ported from BASIS/scripts/css/css_scorer.py
 *
 * Computes CSS scores based on:
 * - Domain scoring (evidence_strength, branch_quality, etc.)
 * - Hard caps
 * - Penalties
 * - Must-have requirements
 */

import { load } from "js-yaml";
import { readFileSync } from "fs";

// Types for CSS configuration
export interface CSSRule {
  path: string;
  op: "not_empty" | "not_null" | "is_null" | "empty" | "not_equals" | "len_ge" | "len_eq";
  value?: unknown;
  skip_if_runtime_mode?: string;
}

export interface ConditionGroup {
  all?: CSSRule[];
  any?: CSSRule[];
}

export interface DomainConfig {
  weight: number;
  description: string;
}

export interface DomainRules {
  confirmed?: ConditionGroup;
  partial?: ConditionGroup;
  notes?: string;
}

export interface HardCap {
  id: string;
  condition: ConditionGroup;
  cap: number;
  reason: string;
}

export interface CSSConfig {
  version: string;
  target_css: number;
  css_gates: {
    tier_a: number;
    tier_b: number;
    tier_c: number;
  };
  domains: Record<string, DomainConfig>;
  domain_rules: Record<string, DomainRules>;
  hard_caps: HardCap[];
  required_evidence_for_css_ge_90?: {
    must_have?: CSSRule[];
  };
  penalties?: Record<string, unknown>;
}

export interface DomainScore {
  status: "confirmed" | "partial" | "unknown";
  score: number;
  max_score: number;
}

export interface CSSResult {
  score: number;
  target: number;
  runtime_mode: string;
  missing_fields?: string[];
  reason?: string;
  domain_scores?: Record<string, DomainScore>;
  raw_score?: number;
  penalized_score?: number;
  hard_cap?: number | null;
  penalties?: Array<{ id: string; amount: number }>;
}

export type RuntimeMode = "prod" | "dev";

export class CSSCalculator {
  private config: CSSConfig;
  private targetCSS: number;

  constructor(config: CSSConfig) {
    this.config = config;
    this.targetCSS = config.target_css ?? 90;
  }

  /**
   * Load CSS configuration from a YAML file
   */
  static fromYamlFile(configPath: string): CSSCalculator {
    const content = readFileSync(configPath, "utf-8");
    const config = load(content) as CSSConfig;
    return new CSSCalculator(config);
  }

  /**
   * Get nested value from object using dot notation
   * Examples:
   *   "ticket.priority" -> obj["ticket"]["priority"]
   *   "evidence.tests_run" -> obj["evidence"]["tests_run"]
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (current !== null && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Evaluate a single operator
   */
  private evaluateOperator(value: unknown, op: CSSRule["op"], expected?: unknown): boolean {
    switch (op) {
      case "not_empty":
        return value !== null && value !== undefined && value !== "";

      case "not_null":
        return value !== null && value !== undefined;

      case "is_null":
        return value === null || value === undefined;

      case "empty":
        return value === null || value === undefined || value === "";

      case "not_equals":
        return value !== expected;

      case "len_ge":
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length >= (expected as number);
        if (typeof value === "string") return value.length >= (expected as number);
        return false;

      case "len_eq":
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length === (expected as number);
        if (typeof value === "string") return value.length === (expected as number);
        return false;

      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  /**
   * Evaluate a single rule against a context payload
   */
  private evaluateRule(cp: Record<string, unknown>, rule: CSSRule): boolean {
    const value = this.getNestedValue(cp, rule.path);
    return this.evaluateOperator(value, rule.op, rule.value);
  }

  /**
   * Evaluate a condition group (all/any)
   */
  private evaluateConditionGroup(cp: Record<string, unknown>, group: ConditionGroup): boolean {
    if (group.all) {
      return group.all.every((rule) => this.evaluateRule(cp, rule));
    }
    if (group.any) {
      return group.any.some((rule) => this.evaluateRule(cp, rule));
    }
    throw new Error(`Invalid condition group: ${JSON.stringify(group)}`);
  }

  /**
   * Evaluate must_have requirements with runtime_mode support
   */
  evaluateMustHave(
    cp: Record<string, unknown>,
    runtimeMode: RuntimeMode = "prod"
  ): { allMet: boolean; missingFields: string[] } {
    const mustHaveRules = this.config.required_evidence_for_css_ge_90?.must_have ?? [];
    const missingFields: string[] = [];

    for (const rule of mustHaveRules) {
      // Check skip condition
      if (rule.skip_if_runtime_mode === runtimeMode) {
        continue;
      }

      if (!this.evaluateRule(cp, rule)) {
        missingFields.push(rule.path);
      }
    }

    return {
      allMet: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Evaluate a single domain
   */
  evaluateDomain(cp: Record<string, unknown>, domainName: string): "confirmed" | "partial" | "unknown" {
    const domainRules = this.config.domain_rules?.[domainName];
    if (!domainRules) return "unknown";

    // Check confirmed first
    if (domainRules.confirmed) {
      if (this.evaluateConditionGroup(cp, domainRules.confirmed)) {
        return "confirmed";
      }
    }

    // Check partial
    if (domainRules.partial) {
      if (this.evaluateConditionGroup(cp, domainRules.partial)) {
        return "partial";
      }
    }

    return "unknown";
  }

  /**
   * Compute scores for all domains
   */
  computeDomainScores(cp: Record<string, unknown>): Record<string, DomainScore> {
    const domains = this.config.domains ?? {};
    const domainScores: Record<string, DomainScore> = {};

    for (const [domainName, domainConfig] of Object.entries(domains)) {
      const weight = domainConfig.weight;
      const status = this.evaluateDomain(cp, domainName);

      // Score calculation:
      // - confirmed: full weight
      // - partial: half weight
      // - unknown: 0
      let score: number;
      if (status === "confirmed") {
        score = weight;
      } else if (status === "partial") {
        score = weight / 2;
      } else {
        score = 0;
      }

      domainScores[domainName] = {
        status,
        score,
        max_score: weight
      };
    }

    return domainScores;
  }

  /**
   * Apply hard caps and return the lowest applicable cap
   */
  applyHardCaps(cp: Record<string, unknown>): number | null {
    const hardCaps = this.config.hard_caps ?? [];
    const applicableCaps: Array<{ id: string; cap: number; reason: string }> = [];

    for (const capRule of hardCaps) {
      if (this.evaluateConditionGroup(cp, capRule.condition)) {
        applicableCaps.push({
          id: capRule.id,
          cap: capRule.cap,
          reason: capRule.reason
        });
      }
    }

    if (applicableCaps.length > 0) {
      // Return lowest cap (most restrictive)
      const lowest = applicableCaps.reduce((min, curr) =>
        curr.cap < min.cap ? curr : min
      );
      return lowest.cap;
    }

    return null;
  }

  /**
   * Apply penalties based on contradictions or unverified assumptions
   */
  applyPenalties(
    cp: Record<string, unknown>,
    baseScore: number
  ): { score: number; penalties: Array<{ id: string; amount: number }> } {
    // Simplified implementation - real penalty detection would require
    // more sophisticated logic to detect contradictions
    const penalties: Array<{ id: string; amount: number }> = [];
    return { score: baseScore, penalties };
  }

  /**
   * Compute CSS score
   */
  computeCSS(cp: Record<string, unknown>, runtimeMode: RuntimeMode = "prod"): CSSResult {
    // Step 1: Evaluate must_have (early exit optimization)
    const { allMet, missingFields } = this.evaluateMustHave(cp, runtimeMode);

    if (!allMet) {
      // Must-have requirements not met
      const hardCap = this.applyHardCaps(cp);
      const finalScore = hardCap !== null
        ? Math.min(hardCap, this.targetCSS - 1)
        : this.targetCSS - 1;

      return {
        score: finalScore,
        target: this.targetCSS,
        runtime_mode: runtimeMode,
        missing_fields: missingFields,
        reason: "must_have_requirements_not_met"
      };
    }

    // Step 2: Full domain scoring
    const domainScores = this.computeDomainScores(cp);

    // Step 3: Sum domain scores
    const rawScore = Object.values(domainScores).reduce((sum, d) => sum + d.score, 0);

    // Step 4: Apply penalties
    const { score: penalizedScore, penalties } = this.applyPenalties(cp, rawScore);

    // Step 5: Apply hard caps
    const hardCap = this.applyHardCaps(cp);
    const finalScore = hardCap !== null
      ? Math.min(penalizedScore, hardCap)
      : penalizedScore;

    return {
      score: Math.round(finalScore),
      target: this.targetCSS,
      runtime_mode: runtimeMode,
      domain_scores: domainScores,
      raw_score: rawScore,
      penalized_score: penalizedScore,
      hard_cap: hardCap,
      penalties
    };
  }

  /**
   * Get CSS tier gates
   */
  getGates(): { tier_a: number; tier_b: number; tier_c: number } {
    return this.config.css_gates ?? { tier_a: 30, tier_b: 60, tier_c: 90 };
  }

  /**
   * Check if a score meets a tier requirement
   */
  meetsTier(score: number, tier: "A" | "B" | "C"): boolean {
    const gates = this.getGates();
    switch (tier) {
      case "A": return score >= gates.tier_a;
      case "B": return score >= gates.tier_b;
      case "C": return score >= gates.tier_c;
    }
  }
}
