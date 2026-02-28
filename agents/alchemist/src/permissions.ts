/**
 * Alchemist Agent Permissions
 *
 * Creative reframing agent. Read-only with brief writing capability.
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

const AGENT_ID = "alchemist" as const;

export const ALCHEMIST_PERMISSIONS = PERMISSION_MATRIX[AGENT_ID];

export function hasPermission(level: AutonomyLevel, permission: Permission): boolean {
  return checkAgentPermission(AGENT_ID, level, permission);
}

export function getPermissions(level: AutonomyLevel): Permission[] {
  return getAgentPermissions(AGENT_ID, level);
}

export function validatePermissions(
  level: AutonomyLevel,
  requested: Permission[]
): PermissionValidationResult {
  return validateAgentPermissions(AGENT_ID, level, requested);
}
