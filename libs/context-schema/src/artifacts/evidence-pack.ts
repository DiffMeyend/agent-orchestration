import { z } from "zod";

/**
 * EvidencePack - Resonant agent output
 * Purpose: Validate ideas against reality, gather evidence, flag risks
 */

export const FactSchema = z.object({
  claim: z.string(),
  source: z.string(),
  confidence: z.number().min(0).max(1)
});

export const RiskSchema = z.object({
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  mitigation: z.string()
});

export const ConstraintSchema = z.object({
  type: z.enum(["technical", "policy", "resource", "time"]),
  description: z.string()
});

export const ValuesAlignmentSchema = z.object({
  value: z.string(),
  alignment: z.enum(["aligned", "neutral", "conflicts"]),
  notes: z.string()
});

export const EvidencePackSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  task_map_ref: z.string(),
  facts: z.array(FactSchema),
  risks: z.array(RiskSchema),
  constraints: z.array(ConstraintSchema),
  values_alignment: z.array(ValuesAlignmentSchema),
  recommendation: z.string()
});

export type Fact = z.infer<typeof FactSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type ValuesAlignment = z.infer<typeof ValuesAlignmentSchema>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
