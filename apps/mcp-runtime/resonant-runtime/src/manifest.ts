import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { appendLog } from './logs.js';
import type { AutonomyDecision, AutonomyLevel, RuntimeStateName, TaskType } from 'slate-contracts';
export type { TaskType, AutonomyDecision } from 'slate-contracts';

interface RuntimeStateConfig {
  defaults?: Partial<Record<TaskType, AutonomyLevel>>;
}

interface SlateManifest {
  autonomy_model?: {
    runtime_states?: Record<string, RuntimeStateConfig>;
  };
}

const FALLBACK_AUTONOMY: Record<RuntimeStateName, Record<TaskType, AutonomyLevel>> = {
  deep_focus: { simple_task: 'L3', complex_task: 'L2' },
  faded_focus: { simple_task: 'L1', complex_task: 'L1' },
  simple_task: { simple_task: 'L3', complex_task: 'L2' },
  complex_task: { simple_task: 'L2', complex_task: 'L1' }
};

let autonomyMap: Record<RuntimeStateName, Record<TaskType, AutonomyLevel>> | null = null;
let autonomySource: 'manifest' | 'fallback' = 'fallback';
let lastManifestPath: string | null = null;

function resolveManifestPath(): string {
  const envPath = process.env.SLATE_MANIFEST_PATH;
  if (envPath && envPath.trim()) {
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  }
  return path.join(process.cwd(), 'tools', 'agents', 'slate.yaml');
}

function loadManifestAutonomy(): void {
  const manifestPath = resolveManifestPath();
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = YAML.parse(raw) as SlateManifest | undefined;
    const runtimeStates = parsed?.autonomy_model?.runtime_states ?? {};
    const map: Record<RuntimeStateName, Record<TaskType, AutonomyLevel>> = {
      ...FALLBACK_AUTONOMY
    };

    (Object.keys(runtimeStates) as RuntimeStateName[]).forEach((state) => {
      if (!(state in FALLBACK_AUTONOMY)) {
        return;
      }
      const defaults = runtimeStates[state]?.defaults ?? {};
      const current = { ...FALLBACK_AUTONOMY[state] };
      (Object.keys(defaults) as TaskType[]).forEach((taskType) => {
        const level = defaults[taskType];
        if (level && ['L0', 'L1', 'L2', 'L3'].includes(level)) {
          current[taskType] = level as AutonomyLevel;
        }
      });
      map[state] = current;
    });

    autonomyMap = map;
    autonomySource = 'manifest';
    lastManifestPath = manifestPath;
    appendLog({
      level: 'info',
      category: 'startup',
      message: 'Slate manifest loaded for autonomy mapping',
      data: { path: manifestPath }
    });
  } catch (error) {
    console.warn('Slate MCP: Failed to load manifest autonomy, using fallback.', error);
    autonomyMap = { ...FALLBACK_AUTONOMY };
    autonomySource = 'fallback';
    appendLog({
      level: 'warn',
      category: 'startup',
      message: 'Slate manifest failed to load; using fallback autonomy map',
      data: { path: manifestPath, error: (error as Error)?.message ?? String(error) }
    });
  }
}

function ensureAutonomyMap(): void {
  if (!autonomyMap) {
    loadManifestAutonomy();
  }
}

export function decideAutonomy(state: RuntimeStateName, taskType: TaskType): AutonomyDecision {
  ensureAutonomyMap();
  const map = autonomyMap ?? FALLBACK_AUTONOMY;
  const level = map[state]?.[taskType] ?? FALLBACK_AUTONOMY[state][taskType];
  return { state, taskType, level, source: autonomySource };
}
