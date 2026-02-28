/**
 * Artifact Store
 *
 * In-memory storage for pipeline artifacts with lineage tracking.
 */

import type {
  TaskMap,
  EvidencePack,
  DesignSpec,
  PatchSet,
  ShipDecision,
  OptionsSet
} from "@slate/context-schema";

export type ArtifactType =
  | "TaskMap"
  | "EvidencePack"
  | "DesignSpec"
  | "PatchSet"
  | "ShipDecision"
  | "OptionsSet";

export interface StoredArtifact {
  id: string;
  type: ArtifactType;
  data: TaskMap | EvidencePack | DesignSpec | PatchSet | ShipDecision | OptionsSet;
  parentId?: string;
  sessionId: string;
  createdAt: string;
  agentId: string;
  sequence: number; // Monotonically increasing for ordering
}

export interface LineageNode {
  artifact: StoredArtifact;
  parent?: LineageNode;
}

// Global sequence counter for artifact ordering
let globalSequence = 0;

/**
 * Get the next sequence number
 */
export function getNextSequence(): number {
  return ++globalSequence;
}

/**
 * In-memory artifact storage with lineage tracking
 */
export class ArtifactStore {
  private artifacts: Map<string, StoredArtifact> = new Map();

  /**
   * Store an artifact
   */
  store(artifact: StoredArtifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  /**
   * Get an artifact by ID
   */
  get(id: string): StoredArtifact | undefined {
    return this.artifacts.get(id);
  }

  /**
   * Get all artifacts for a session
   */
  getBySession(sessionId: string): StoredArtifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.sessionId === sessionId
    );
  }

  /**
   * Get all artifacts of a specific type
   */
  getByType(type: ArtifactType): StoredArtifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.type === type);
  }

  /**
   * Get the full lineage chain for an artifact
   */
  getLineage(artifactId: string): StoredArtifact[] {
    const chain: StoredArtifact[] = [];
    let current = this.artifacts.get(artifactId);

    while (current) {
      chain.push(current);
      current = current.parentId
        ? this.artifacts.get(current.parentId)
        : undefined;
    }

    return chain;
  }

  /**
   * Get children of an artifact
   */
  getChildren(parentId: string): StoredArtifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.parentId === parentId
    );
  }

  /**
   * Delete an artifact
   */
  delete(id: string): boolean {
    return this.artifacts.delete(id);
  }

  /**
   * Clear all artifacts for a session
   */
  clearSession(sessionId: string): void {
    for (const [id, artifact] of this.artifacts) {
      if (artifact.sessionId === sessionId) {
        this.artifacts.delete(id);
      }
    }
  }

  /**
   * Clear all artifacts
   */
  clear(): void {
    this.artifacts.clear();
  }

  /**
   * Get count of stored artifacts
   */
  get size(): number {
    return this.artifacts.size;
  }
}

/**
 * Create a stored artifact from agent output
 */
export function createStoredArtifact(
  type: ArtifactType,
  data: StoredArtifact["data"],
  sessionId: string,
  agentId: string,
  parentId?: string
): StoredArtifact {
  return {
    id: (data as { id: string }).id,
    type,
    data,
    parentId,
    sessionId,
    createdAt: new Date().toISOString(),
    agentId,
    sequence: getNextSequence()
  };
}
