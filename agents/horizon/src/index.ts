/**
 * Horizon Agent
 *
 * Purpose: Verify patches, run checks, decide ship/iterate/reject.
 * Produces: ShipDecision + ReleaseNotes artifacts
 */

export {
  run,
  createShipDecision,
  createReleaseNotes,
  evaluateShipGates,
  determineDecision,
  validateShipDecision,
  AGENT_METADATA,
  type HorizonInput,
  type HorizonOutput,
  type RunnerConfig,
  type ShipGates,
  type AntiPattern
} from "./runner.js";

export {
  hasPermission,
  getPermissions,
  validatePermissions,
  canApproveMerge,
  HORIZON_PERMISSIONS,
  type AutonomyLevel,
  type Permission
} from "./permissions.js";
