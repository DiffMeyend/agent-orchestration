import type { RuntimeStateName, RuntimeStateSnapshot, RuntimeStateTag } from 'slate-contracts';
export type { RuntimeStateName, RuntimeStateSnapshot, RuntimeStateTag } from 'slate-contracts';

const RUNTIME_STATE_NAMES: RuntimeStateName[] = ['deep_focus', 'faded_focus', 'complex_task', 'simple_task'];
const LEGACY_STATE_ALIASES: Record<string, RuntimeStateName> = {
  faded: 'faded_focus'
};

const VALID_STATES: RuntimeStateTag[] = RUNTIME_STATE_NAMES.map((name) => `#state:${name}` as RuntimeStateTag);
const LEGACY_STATE_TAGS: string[] = Object.keys(LEGACY_STATE_ALIASES).map((alias) => `#state:${alias}`);

let currentState: RuntimeStateSnapshot = {
  tag: '#state:deep_focus',
  updatedAt: new Date().toISOString()
};

export function isRuntimeState(value: unknown): value is RuntimeStateTag {
  if (typeof value !== 'string') {
    return false;
  }
  return (VALID_STATES as string[]).includes(value) || LEGACY_STATE_TAGS.includes(value);
}

export function normalizeStateName(value: unknown): RuntimeStateName | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.startsWith('#state:') ? value.replace('#state:', '') : value;
  const canonical = LEGACY_STATE_ALIASES[trimmed] ?? trimmed;
  return (RUNTIME_STATE_NAMES as string[]).includes(canonical)
    ? (canonical as RuntimeStateName)
    : null;
}

export function getRuntimeState(): RuntimeStateSnapshot {
  return currentState;
}

export function setRuntimeState(
  tag: RuntimeStateTag,
  reason?: string,
  metadata?: Record<string, unknown>
): RuntimeStateSnapshot {
  currentState = {
    tag,
    reason,
    metadata,
    updatedAt: new Date().toISOString()
  };
  return currentState;
}
