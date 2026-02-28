/**
 * Artifact Storage and Versioning
 *
 * Manages versioned artifacts produced by agents in the pipeline.
 * Each artifact has a unique ID, references its source, and is validated against schema.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import {
  TaskMapSchema,
  EvidencePackSchema,
  DesignSpecSchema,
  OptionsSetSchema,
  PatchSetSchema,
  ShipDecisionSchema,
  ReleaseNotesSchema,
  ContextPayloadSchema,
  type TaskMap,
  type EvidencePack,
  type DesignSpec,
  type OptionsSet,
  type PatchSet,
  type ShipDecision,
  type ReleaseNotes,
  type ContextPayload
} from "@slate/context-schema";
import { z } from "zod";

export type ArtifactType =
  | "taskMap"
  | "evidencePack"
  | "designSpec"
  | "optionsSet"
  | "patchSet"
  | "shipDecision"
  | "releaseNotes"
  | "contextPayload";

export type ArtifactData =
  | TaskMap
  | EvidencePack
  | DesignSpec
  | OptionsSet
  | PatchSet
  | ShipDecision
  | ReleaseNotes
  | ContextPayload;

export interface StoredArtifact<T = ArtifactData> {
  id: string;
  type: ArtifactType;
  data: T;
  stored_at: string;
  source_agent: string;
  session_id?: string;
}

// Schema lookup
const SCHEMAS: Record<ArtifactType, z.ZodSchema> = {
  taskMap: TaskMapSchema,
  evidencePack: EvidencePackSchema,
  designSpec: DesignSpecSchema,
  optionsSet: OptionsSetSchema,
  patchSet: PatchSetSchema,
  shipDecision: ShipDecisionSchema,
  releaseNotes: ReleaseNotesSchema,
  contextPayload: ContextPayloadSchema
};

// In-memory artifact cache
const artifactCache: Map<string, StoredArtifact> = new Map();

// Artifact storage directory (relative to cwd)
const ARTIFACTS_DIR = "artifacts";

/**
 * Ensure artifacts directory exists
 */
function ensureArtifactsDir(): string {
  const dir = join(process.cwd(), ARTIFACTS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get artifact file path
 */
function getArtifactPath(id: string): string {
  const dir = ensureArtifactsDir();
  return join(dir, `${id}.json`);
}

/**
 * Validate artifact data against its schema
 */
export function validateArtifact(
  type: ArtifactType,
  data: unknown
): { valid: boolean; errors?: string[] } {
  const schema = SCHEMAS[type];
  if (!schema) {
    return { valid: false, errors: [`Unknown artifact type: ${type}`] };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

/**
 * Register (store) a new artifact
 */
export function registerArtifact(
  type: ArtifactType,
  data: ArtifactData,
  sourceAgent: string,
  sessionId?: string
): { success: boolean; artifact?: StoredArtifact; errors?: string[] } {
  // Validate
  const validation = validateArtifact(type, data);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Get ID from data
  const id = (data as { id: string }).id;
  if (!id) {
    return { success: false, errors: ["Artifact must have an 'id' field"] };
  }

  const stored: StoredArtifact = {
    id,
    type,
    data,
    stored_at: new Date().toISOString(),
    source_agent: sourceAgent,
    session_id: sessionId
  };

  // Store in cache
  artifactCache.set(id, stored);

  // Persist to file
  try {
    const path = getArtifactPath(id);
    writeFileSync(path, JSON.stringify(stored, null, 2));
  } catch (error) {
    // File write failure is not fatal - we still have cache
    console.error(`Failed to persist artifact ${id}:`, error);
  }

  return { success: true, artifact: stored };
}

/**
 * Query artifacts by type, agent, or session
 */
export function queryArtifacts(filter: {
  type?: ArtifactType;
  source_agent?: string;
  session_id?: string;
  limit?: number;
}): StoredArtifact[] {
  // Load from files if cache is empty
  if (artifactCache.size === 0) {
    loadArtifactsFromDisk();
  }

  let results = Array.from(artifactCache.values());

  if (filter.type) {
    results = results.filter((a) => a.type === filter.type);
  }

  if (filter.source_agent) {
    results = results.filter((a) => a.source_agent === filter.source_agent);
  }

  if (filter.session_id) {
    results = results.filter((a) => a.session_id === filter.session_id);
  }

  // Sort by stored_at descending
  results.sort((a, b) => b.stored_at.localeCompare(a.stored_at));

  if (filter.limit && filter.limit > 0) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

/**
 * Get a specific artifact by ID
 */
export function getArtifact(id: string): StoredArtifact | undefined {
  // Check cache first
  if (artifactCache.has(id)) {
    return artifactCache.get(id);
  }

  // Try loading from disk
  const path = getArtifactPath(id);
  if (existsSync(path)) {
    try {
      const content = readFileSync(path, "utf-8");
      const artifact = JSON.parse(content) as StoredArtifact;
      artifactCache.set(id, artifact);
      return artifact;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Load all artifacts from disk into cache
 */
function loadArtifactsFromDisk(): void {
  const dir = ensureArtifactsDir();
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = readFileSync(join(dir, file), "utf-8");
        const artifact = JSON.parse(content) as StoredArtifact;
        artifactCache.set(artifact.id, artifact);
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // Directory might not exist yet
  }
}

/**
 * Get artifact chain (follow references backwards)
 */
export function getArtifactChain(artifactId: string): StoredArtifact[] {
  const chain: StoredArtifact[] = [];
  const visited = new Set<string>();

  function followRefs(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);

    const artifact = getArtifact(id);
    if (!artifact) return;

    chain.unshift(artifact);

    // Look for reference fields
    const data = artifact.data as Record<string, unknown>;
    const refFields = [
      "task_map_ref",
      "evidence_pack_ref",
      "design_spec_ref",
      "options_set_ref",
      "patch_set_ref",
      "ship_decision_ref"
    ];

    for (const field of refFields) {
      const ref = data[field];
      if (typeof ref === "string") {
        followRefs(ref);
      }
    }
  }

  followRefs(artifactId);
  return chain;
}
