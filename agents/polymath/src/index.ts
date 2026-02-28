/**
 * Polymath Agent
 *
 * Purpose: Divergent exploration, surface unknowns, generate hypotheses.
 * Produces: TaskMap artifact
 */

export {
  run,
  createTaskMap,
  validateTaskMap,
  AGENT_METADATA,
  type PolymathInput,
  type PolymathOutput,
  type RunnerConfig
} from "./runner.js";

export {
  hasPermission,
  getPermissions,
  validatePermissions,
  POLYMATH_PERMISSIONS,
  type AutonomyLevel,
  type Permission
} from "./permissions.js";
