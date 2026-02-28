import { z } from "zod";

/**
 * PatchSet - Executor agent output
 * Purpose: Implementation in isolated git worktree
 */

export const CommandResultSchema = z.object({
  command: z.string(),
  exit_code: z.number(),
  stdout: z.string(),
  stderr: z.string()
});

export const TestResultSchema = z.object({
  suite: z.string(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  details: z.string()
});

export const PatchSetSchema = z.object({
  id: z.string(),
  created_at: z.string().datetime(),
  design_spec_ref: z.string(),
  options_set_ref: z.string().optional(),
  worktree: z.string(),
  branch: z.string(),
  diff_summary: z.string(),
  files_changed: z.array(z.string()),
  commands_run: z.array(CommandResultSchema),
  test_results: z.array(TestResultSchema),
  how_to_verify: z.string()
});

export type CommandResult = z.infer<typeof CommandResultSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type PatchSet = z.infer<typeof PatchSetSchema>;
