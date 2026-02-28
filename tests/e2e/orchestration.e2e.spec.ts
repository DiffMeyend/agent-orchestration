/**
 * Orchestration E2E Tests
 *
 * Tests multi-agent session management with state handoffs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OrchestratorSession,
  SessionManager,
  ArtifactStore,
  createStoredArtifact,
  type SessionConfig
} from '@slate/orchestration';
import type { ContextPayload } from '@slate/context-schema';

describe('Orchestration E2E', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('Session Management', () => {
    it('should manage multiple concurrent sessions', () => {
      const session1 = sessionManager.create(createConfig('Goal 1'));
      const session2 = sessionManager.create(createConfig('Goal 2'));
      const session3 = sessionManager.create(createConfig('Goal 3'));

      expect(sessionManager.size).toBe(3);

      const sessions = sessionManager.list();
      expect(sessions).toHaveLength(3);
      expect(sessions.map(s => s.id)).toContain(session1.id);
      expect(sessions.map(s => s.id)).toContain(session2.id);
      expect(sessions.map(s => s.id)).toContain(session3.id);
    });

    it('should retrieve session by ID', () => {
      const session = sessionManager.create(createConfig('Test goal'));

      const retrieved = sessionManager.get(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionManager.get('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should delete session', () => {
      const session = sessionManager.create(createConfig('To delete'));
      expect(sessionManager.size).toBe(1);

      const deleted = sessionManager.delete(session.id);
      expect(deleted).toBe(true);
      expect(sessionManager.size).toBe(0);
      expect(sessionManager.get(session.id)).toBeUndefined();
    });
  });

  describe('State Handoffs', () => {
    it('should preserve artifacts across step transitions', () => {
      const session = sessionManager.create(createConfig('State handoff test'));
      session.start();

      // Store artifact at step 1
      const artifact1 = {
        id: 'art-1',
        created_at: new Date().toISOString(),
        goal: 'Test',
        assumptions: [],
        unknowns: [],
        options: [],
        quick_checks: [],
        recommended_next: 'Next'
      };
      session.storeArtifact('TaskMap', artifact1, 'polymath');

      // Advance to next step
      session.advanceTo('resonant');

      // Artifact should still be accessible
      const retrieved = session.getArtifact('art-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.agentId).toBe('polymath');
    });

    it('should track which agent produced each artifact', () => {
      const session = sessionManager.create(createConfig('Agent tracking'));
      session.start();

      session.storeArtifact('TaskMap', createMockTaskMap('tm-1'), 'polymath');
      session.advanceTo('resonant');
      session.storeArtifact('EvidencePack', createMockEvidencePack('ep-1'), 'resonant', 'tm-1');
      session.advanceTo('architect');
      session.storeArtifact('DesignSpec', createMockDesignSpec('ds-1'), 'architect', 'ep-1');

      const artifacts = session.getAllArtifacts();

      const taskMap = artifacts.find(a => a.id === 'tm-1');
      const evidencePack = artifacts.find(a => a.id === 'ep-1');
      const designSpec = artifacts.find(a => a.id === 'ds-1');

      expect(taskMap?.agentId).toBe('polymath');
      expect(evidencePack?.agentId).toBe('resonant');
      expect(designSpec?.agentId).toBe('architect');
    });
  });

  describe('Session Metadata', () => {
    it('should track session timestamps', () => {
      const session = sessionManager.create(createConfig('Timestamp test'));
      const metadata1 = session.getMetadata();

      expect(metadata1.createdAt).toBeDefined();
      expect(metadata1.updatedAt).toBe(metadata1.createdAt);

      // Transition should update the updatedAt timestamp
      session.start();
      const metadata2 = session.getMetadata();

      // Both should be valid ISO timestamps
      expect(new Date(metadata2.createdAt).toISOString()).toBe(metadata2.createdAt);
      expect(new Date(metadata2.updatedAt).toISOString()).toBe(metadata2.updatedAt);

      // createdAt should not change
      expect(metadata2.createdAt).toBe(metadata1.createdAt);

      // After starting, state should be running
      expect(metadata2.state).toBe('running');
    });

    it('should include current step in metadata', () => {
      const session = sessionManager.create(createConfig('Step tracking'));

      expect(session.getMetadata().currentStep).toBeUndefined();

      session.start();
      expect(session.getMetadata().currentStep).toBe('polymath');

      session.advanceTo('resonant');
      expect(session.getMetadata().currentStep).toBe('resonant');
    });

    it('should include config in metadata', () => {
      const config = createConfig('Config test');
      const session = sessionManager.create(config);
      const metadata = session.getMetadata();

      expect(metadata.config.goal).toBe('Config test');
      expect(metadata.config.autonomyLevel).toBe('L2');
    });
  });

  describe('Artifact Store', () => {
    it('should query artifacts by type', () => {
      const store = new ArtifactStore();

      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-1'), 'session-1', 'polymath'));
      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-2'), 'session-1', 'polymath'));
      store.store(createStoredArtifact('EvidencePack', createMockEvidencePack('ep-1'), 'session-1', 'resonant', 'tm-1'));

      const taskMaps = store.getByType('TaskMap');
      expect(taskMaps).toHaveLength(2);

      const evidencePacks = store.getByType('EvidencePack');
      expect(evidencePacks).toHaveLength(1);
    });

    it('should query artifacts by session', () => {
      const store = new ArtifactStore();

      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-1'), 'session-1', 'polymath'));
      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-2'), 'session-2', 'polymath'));

      const session1Artifacts = store.getBySession('session-1');
      expect(session1Artifacts).toHaveLength(1);
      expect(session1Artifacts[0].id).toBe('tm-1');
    });

    it('should get children of an artifact', () => {
      const store = new ArtifactStore();

      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-1'), 'session-1', 'polymath'));
      store.store(createStoredArtifact('EvidencePack', createMockEvidencePack('ep-1'), 'session-1', 'resonant', 'tm-1'));
      store.store(createStoredArtifact('EvidencePack', createMockEvidencePack('ep-2'), 'session-1', 'resonant', 'tm-1'));

      const children = store.getChildren('tm-1');
      expect(children).toHaveLength(2);
    });

    it('should clear session artifacts', () => {
      const store = new ArtifactStore();

      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-1'), 'session-1', 'polymath'));
      store.store(createStoredArtifact('TaskMap', createMockTaskMap('tm-2'), 'session-2', 'polymath'));

      store.clearSession('session-1');

      expect(store.size).toBe(1);
      expect(store.get('tm-1')).toBeUndefined();
      expect(store.get('tm-2')).toBeDefined();
    });
  });
});

// Helper functions

function createConfig(goal: string): SessionConfig {
  return {
    goal,
    context: createMockContext(),
    autonomyLevel: 'L2'
  };
}

function createMockContext(): ContextPayload {
  return {
    questions: {},
    decision_matrix: {}
  };
}

function createMockTaskMap(id: string) {
  return {
    id,
    created_at: new Date().toISOString(),
    goal: 'Test',
    assumptions: [],
    unknowns: [],
    options: [],
    quick_checks: [],
    recommended_next: 'Next'
  };
}

function createMockEvidencePack(id: string) {
  return {
    id,
    created_at: new Date().toISOString(),
    facts: [],
    risks: [],
    constraints: [],
    values_alignment: { safety: 'high', helpfulness: 'high', honesty: 'high' },
    recommendation: 'Proceed'
  };
}

function createMockDesignSpec(id: string) {
  return {
    id,
    created_at: new Date().toISOString(),
    scope: 'Test scope',
    acceptance_criteria: [],
    interfaces: [],
    non_goals: [],
    test_plan: 'Test plan'
  };
}
