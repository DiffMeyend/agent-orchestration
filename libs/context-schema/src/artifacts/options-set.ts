import { z } from "zod";

/**
 * OptionsSet - Alchemist agent output
 * Purpose: Creative reframing when stuck, generate novel approaches
 */

export const CreativeOptionSchema = z.object({
  option_id: z.string(),
  reframe: z.string(),
  approach: z.string(),
  preserves: z.array(z.string()),
  risks: z.array(z.string()),
  value_add: z.string()
});

export const OptionsSetSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  design_spec_ref: z.string(),
  trigger: z.enum(["stuck", "rejected", "user_request", "creative_block"]),
  options: z.array(CreativeOptionSchema),
  safe_default: z.string()
});

export type CreativeOption = z.infer<typeof CreativeOptionSchema>;
export type OptionsSet = z.infer<typeof OptionsSetSchema>;
