import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AutonomyDecision,
  Mode,
  RuntimeStateSnapshot,
  SlateHistoryEvent,
  SlateHistoryEventType,
  HistoryStatus
} from 'slate-contracts';

const DEFAULT_HISTORY_RELATIVE_PATH = path.join('~', '.meyend', 'history.json');
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;

let history: SlateHistoryEvent[] = [];
let historyPath: string | undefined;
let initialized = false;
let lastErrorMessage: string | undefined;

function resolveHistoryPath(): string {
  if (historyPath) {
    return historyPath;
  }
  const envPath = process.env.SLATE_HISTORY_PATH;
  const basePath = envPath && envPath.trim() ? envPath : DEFAULT_HISTORY_RELATIVE_PATH;
  const expanded = expandHome(basePath);
  historyPath = path.isAbsolute(expanded) ? expanded : path.join(process.cwd(), expanded);
  return historyPath;
}

function expandHome(p: string): string {
  if (p.startsWith('~')) {
    const home = process.env.HOME || process.cwd();
    const remainder = p.slice(1).replace(/^[/\\]?/, '');
    return path.join(home, remainder);
  }
  return p;
}

export async function initHistory(customPath?: string): Promise<void> {
  historyPath = customPath ? customPath : resolveHistoryPath();
  const dir = path.dirname(historyPath);
  await fs.mkdir(dir, { recursive: true });
  try {
    const raw = await fs.readFile(historyPath, 'utf8');
    history = JSON.parse(raw);
    if (!Array.isArray(history)) {
      history = [];
    }
    lastErrorMessage = undefined;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      history = [];
      lastErrorMessage = undefined;
    } else {
      console.warn('Slate history load failed, starting fresh.', error);
      history = [];
      lastErrorMessage = error instanceof Error ? error.message : String(error);
    }
  }
  initialized = true;
}

async function persistHistory(): Promise<void> {
  const target = resolveHistoryPath();
  await fs.writeFile(target, JSON.stringify(history, null, 2), { encoding: 'utf8', mode: 0o600 });
}

export async function appendHistory(event: Omit<SlateHistoryEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<void> {
  if (!initialized) {
    await initHistory();
  }
  const fullEvent: SlateHistoryEvent = {
    id: event.id ?? randomUUID(),
    timestamp: event.timestamp ?? new Date().toISOString(),
    type: event.type,
    state: event.state,
    mode: event.mode,
    decision: event.decision,
    source: event.source ?? 'runtime'
  };
  history.push(fullEvent);
  try {
    await persistHistory();
    lastErrorMessage = undefined;
  } catch (error) {
    console.error('Slate history persist failed', error);
    lastErrorMessage = error instanceof Error ? error.message : String(error);
  }
}

export function getHistory(limit?: number, type?: SlateHistoryEventType): SlateHistoryEvent[] {
  let entries = history;
  if (type) {
    entries = entries.filter((event) => event.type === type);
  }
  const normalized = normalizeLimit(limit);
  const sliced = normalized ? entries.slice(-normalized) : entries;
  return [...sliced].reverse();
}

function normalizeLimit(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return DEFAULT_HISTORY_LIMIT;
  }
  const clamped = Math.min(Math.max(Math.floor(value), 1), MAX_HISTORY_LIMIT);
  return clamped;
}

export const HISTORY_EVENT_TYPES = {
  STATE_CHANGE: 'state_change' as SlateHistoryEventType,
  MODE_CHANGE: 'mode_change' as SlateHistoryEventType,
  AUTONOMY_DECISION: 'autonomy_decision' as SlateHistoryEventType
};

export const HISTORY_EVENT_TYPES_ARRAY: SlateHistoryEventType[] = Object.values(HISTORY_EVENT_TYPES);

export function getHistoryStatus(): HistoryStatus {
  return {
    path: resolveHistoryPath(),
    count: history.length,
    lastError: lastErrorMessage ?? null
  };
}

export async function rotateHistory(): Promise<void> {
  if (!initialized) {
    await initHistory();
  }
  history = [];
  lastErrorMessage = undefined;
  await persistHistory();
}

export function historyStats() {
  return { count: history.length, path: historyPath ?? resolveHistoryPath() };
}
