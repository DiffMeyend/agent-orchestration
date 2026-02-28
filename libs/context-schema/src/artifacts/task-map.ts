import { z } from "zod";

/**
 * TaskMap - Polymath agent output
 * Purpose: Divergent exploration, surface unknowns, generate hypotheses
 */

export const TaskMapOptionSchema = z.object({
  id: z.string(),
  description: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string())
});

export const TaskMapSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  goal: z.string(),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  options: z.array(TaskMapOptionSchema),
  quick_checks: z.array(z.string()),
  recommended_next: z.string()
});

export type TaskMapOption = z.infer<typeof TaskMapOptionSchema>;
export type TaskMap = z.infer<typeof TaskMapSchema>;
