/**
 * Permission Matrix
 *
 * Lookup table: getPermissions(agent, autonomyLevel) → Permission[]
 * Reference: slate_architecture.md:471-507
 */

import type { AgentId, AutonomyLevel, Permission, PermissionValidationResult } from "./permission-types.js";

/**
 * Master permission matrix for all agents
 */
export const PERMISSION_MATRIX: Record<AgentId, Record<AutonomyLevel, Permission[]>> = {
  // Read-only agents
  polymath: {
    L0: ["read_repo", "search_docs"],
    L1: ["read_repo", "search_docs"],
    L2: ["read_repo", "search_docs"],
    L3: ["read_repo", "search_docs"]
  },
  resonant: {
    L0: ["read_repo", "search_docs"],
    L1: ["read_repo", "search_docs"],
    L2: ["read_repo", "search_docs"],
    L3: ["read_repo", "search_docs"]
  },
  architect: {
    L0: ["read_repo", "search_docs"],
    L1: ["read_repo", "search_docs"],
    L2: ["read_repo", "search_docs"],
    L3: ["read_repo", "search_docs"]
  },
  alchemist: {
    L0: ["read_repo", "search_docs"],
    L1: ["read_repo", "search_docs"],
    L2: ["read_repo", "search_docs"],
    L3: ["read_repo", "search_docs"]
  },

  // Write-capable agent (worktree isolated)
  executor: {
    L0: [],
    L1: ["read_repo", "propose_diff"],
    L2: ["read_repo", "write_files_in_worktree", "run_tests"],
    L3: ["read_repo", "write_files_in_worktree", "run_tests", "commit_to_branch"]
  },

  // Verification agent
  horizon: {
    L0: ["read_repo", "diff_view"],
    L1: ["read_repo", "diff_view", "run_verification_tests"],
    L2: ["read_repo", "diff_view", "run_verification_tests"],
    L3: ["read_repo", "diff_view", "run_verification_tests", "approve_merge"]
  }
};

/**
 * Get all permissions for an agent at a given autonomy level
 */
export function getPermissions(agent: AgentId, level: AutonomyLevel): Permission[] {
  return PERMISSION_MATRIX[agent][level];
}

/**
 * Check if a permission is allowed for an agent at a given autonomy level
 */
export function hasPermission(
  agent: AgentId,
  level: AutonomyLevel,
  permission: Permission
): boolean {
  return PERMISSION_MATRIX[agent][level].includes(permission);
}

/**
 * Validate that all requested permissions are allowed
 */
export function validatePermissions(
  agent: AgentId,
  level: AutonomyLevel,
  requested: Permission[]
): PermissionValidationResult {
  const allowed = PERMISSION_MATRIX[agent][level];
  const denied = requested.filter((p) => !allowed.includes(p));
  return {
    valid: denied.length === 0,
    denied
  };
}
