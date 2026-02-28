import { z } from "zod";

/**
 * ShipDecision + ReleaseNotes - Horizon agent output
 * Purpose: Verify patch, run checks, decide ship vs iterate
 */

export const ShipDecisionSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  patch_set_ref: z.string(),
  decision: z.enum(["ship", "iterate", "reject"]),
  rationale: z.string(),
  blocking_issues: z.array(z.string()),
  followups: z.array(z.string()),
  anti_patterns_detected: z.array(z.string())
});

export const ReleaseNotesSchema = z.object({
  id: z.string(),
  ship_decision_ref: z.string(),
  summary: z.string(),
  changes: z.array(z.string()),
  breaking_changes: z.array(z.string()),
  migration_steps: z.array(z.string())
});

export type ShipDecision = z.infer<typeof ShipDecisionSchema>;
export type ReleaseNotes = z.infer<typeof ReleaseNotesSchema>;
