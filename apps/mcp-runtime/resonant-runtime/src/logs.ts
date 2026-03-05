import { randomUUID } from 'node:crypto';
import type { SlateLogEntry } from 'slate-contracts';

const entries: SlateLogEntry[] = [];

export function appendLog(
  entry: Omit<SlateLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): SlateLogEntry {
  const stored: SlateLogEntry = {
    id: entry.id ?? randomUUID(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    level: entry.level,
    category: entry.category,
    message: entry.message,
    data: entry.data
  };
  entries.push(stored);
  return stored;
}

export function getLogs(limit = 50): SlateLogEntry[] {
  if (limit <= 0) {
    return [];
  }
  return entries.slice(-limit).reverse();
}
