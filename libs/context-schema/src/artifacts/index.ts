// Agent Artifacts

export {
  TaskMapSchema,
  TaskMapOptionSchema,
  type TaskMap,
  type TaskMapOption
} from "./task-map.js";

export {
  EvidencePackSchema,
  FactSchema,
  RiskSchema,
  ConstraintSchema,
  ValuesAlignmentSchema,
  type EvidencePack,
  type Fact,
  type Risk,
  type Constraint,
  type ValuesAlignment
} from "./evidence-pack.js";

export {
  DesignSpecSchema,
  InterfaceSchema,
  AcceptanceCriterionSchema,
  type DesignSpec,
  type Interface,
  type AcceptanceCriterion
} from "./design-spec.js";

export {
  OptionsSetSchema,
  CreativeOptionSchema,
  type OptionsSet,
  type CreativeOption
} from "./options-set.js";

export {
  PatchSetSchema,
  CommandResultSchema,
  TestResultSchema,
  type PatchSet,
  type CommandResult,
  type TestResult
} from "./patch-set.js";

export {
  ShipDecisionSchema,
  ReleaseNotesSchema,
  type ShipDecision,
  type ReleaseNotes
} from "./ship-decision.js";

export {
  ContextPayloadSchema,
  TenQuestionsSchema,
  ActorsSchema,
  MotivationSchema,
  ConstraintsSchema,
  BoundsSchema,
  SemioticsSchema,
  TemporalitySchema,
  LocationSchema,
  EnvironmentSchema,
  FrameSchema,
  AnchorsSchema,
  DecisionMatrixSchema,
  DecisionOptionSchema,
  ContextPayloadMetadataSchema,
  type ContextPayload,
  type TenQuestions,
  type Actors,
  type Motivation,
  type Constraints,
  type Bounds,
  type Semiotics,
  type Temporality,
  type Location,
  type Environment,
  type Frame,
  type Anchors,
  type DecisionMatrix,
  type DecisionOption,
  type ContextPayloadMetadata
} from "./context-payload.js";

// Artifact schema collection for validation
export const ArtifactSchemas = {
  taskMap: () => import("./task-map.js").then(m => m.TaskMapSchema),
  evidencePack: () => import("./evidence-pack.js").then(m => m.EvidencePackSchema),
  designSpec: () => import("./design-spec.js").then(m => m.DesignSpecSchema),
  optionsSet: () => import("./options-set.js").then(m => m.OptionsSetSchema),
  patchSet: () => import("./patch-set.js").then(m => m.PatchSetSchema),
  shipDecision: () => import("./ship-decision.js").then(m => m.ShipDecisionSchema),
  releaseNotes: () => import("./ship-decision.js").then(m => m.ReleaseNotesSchema),
  contextPayload: () => import("./context-payload.js").then(m => m.ContextPayloadSchema)
} as const;

export type ArtifactName = keyof typeof ArtifactSchemas;
