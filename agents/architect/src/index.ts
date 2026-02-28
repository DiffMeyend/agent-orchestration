/**
 * Architect Agent
 *
 * Converts EvidencePack inputs into DesignSpec artifacts.
 */

export {
  run,
  createDesignSpec,
  validateDesignSpec,
  defineScope,
  specifyInterfaces,
  generateAcceptanceCriteria,
  createTestPlan,
  AGENT_METADATA,
  type ArchitectInput,
  type ArchitectOutput,
  type RunnerConfig
} from "./runner.js";

export {
  hasPermission,
  getPermissions,
  validatePermissions,
  ARCHITECT_PERMISSIONS,
  type AutonomyLevel,
  type Permission
} from "./permissions.js";
