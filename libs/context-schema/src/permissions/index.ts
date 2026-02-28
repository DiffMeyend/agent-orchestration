/**
 * Permissions Module
 *
 * Shared permission types and matrix for SLATE agents.
 */

export type {
  AgentId,
  AutonomyLevel,
  Permission,
  PermissionValidationResult
} from "./permission-types.js";

export {
  PERMISSION_MATRIX,
  getPermissions,
  hasPermission,
  validatePermissions
} from "./permission-matrix.js";
