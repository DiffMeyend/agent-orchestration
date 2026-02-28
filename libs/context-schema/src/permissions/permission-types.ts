/**
 * Permission Types
 *
 * Shared permission definitions for all SLATE agents.
 * Reference: slate_architecture.md:471-507
 */

export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

export type Permission =
  | "read_repo"
  | "search_docs"
  | "run_readonly_checks"
  | "run_tests_readonly"
  | "write_specs_only"
  | "write_briefs"
  | "write_files_in_worktree"
  | "run_tests"
  | "commit_to_branch"
  | "propose_diff"
  | "diff_view"
  | "run_verification_tests"
  | "approve_merge";

export type AgentId =
  | "polymath"
  | "resonant"
  | "architect"
  | "alchemist"
  | "executor"
  | "horizon";

export interface PermissionValidationResult {
  valid: boolean;
  denied: Permission[];
}
