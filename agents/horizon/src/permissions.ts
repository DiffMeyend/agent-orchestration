/**
 * Horizon Agent Permissions
 *
 * Horizon reviews patches and decides ship/iterate/reject.
 * Read-only plus verification capabilities. Cannot merge directly.
 */

import {
  type AutonomyLevel,
  type Permission,
  type PermissionValidationResult,
  PERMISSION_MATRIX,
  getPermissions as getAgentPermissions,
  hasPermission as checkAgentPermission,
  validatePermissions as validateAgentPermissions
} from "@slate/context-schema";

export type { AutonomyLevel, Permission };

const AGENT_ID = "horizon" as const;

/**
 * Horizon permission matrix (read-only reference)
 */
export const HORIZON_PERMISSIONS = PERMISSION_MATRIX[AGENT_ID];

/**
 * Check if a permission is allowed at the given autonomy level
 */
export function hasPermission(level: AutonomyLevel, permission: Permission): boolean {
  return checkAgentPermission(AGENT_ID, level, permission);
}

/**
 * Get all permissions for an autonomy level
 */
export function getPermissions(level: AutonomyLevel): Permission[] {
  return getAgentPermissions(AGENT_ID, level);
}

/**
 * Validate that requested permissions are allowed
 */
export function validatePermissions(
  level: AutonomyLevel,
  requested: Permission[]
): PermissionValidationResult {
  return validateAgentPermissions(AGENT_ID, level, requested);
}

/**
 * Check if Horizon can approve merge at this level
 */
export function canApproveMerge(level: AutonomyLevel): boolean {
  return hasPermission(level, "approve_merge");
}
