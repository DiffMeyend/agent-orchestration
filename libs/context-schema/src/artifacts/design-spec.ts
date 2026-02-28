import { z } from "zod";

/**
 * DesignSpec - Architect agent output
 * Purpose: Transform evidence into buildable design with interfaces and acceptance criteria
 */

export const InterfaceSchema = z.object({
  name: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  contract: z.string()
});

export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  verification: z.string()
});

export const DesignSpecSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  evidence_pack_ref: z.string(),
  scope: z.string(),
  non_goals: z.array(z.string()),
  interfaces: z.array(InterfaceSchema),
  files_to_touch: z.array(z.string()),
  acceptance_criteria: z.array(AcceptanceCriterionSchema),
  test_plan: z.string(),
  rollback_plan: z.string()
});

export type Interface = z.infer<typeof InterfaceSchema>;
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;
export type DesignSpec = z.infer<typeof DesignSpecSchema>;
