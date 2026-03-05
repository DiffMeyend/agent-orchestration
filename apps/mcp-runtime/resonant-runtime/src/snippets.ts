import fs from 'node:fs';
import path from 'node:path';
import type { SlateSnippet } from 'slate-contracts';
import { appendLog } from './logs.js';

const catalog = new Map<string, SlateSnippet>();

function makeId(base: string, index: number): string {
  if (index === 0) {
    return base;
  }
  return `${base}#${index}`;
}

export function refreshSnippets(rootDir = path.join(process.cwd(), 'tools', 'snippets')): void {
  catalog.clear();

  if (!fs.existsSync(rootDir)) {
    return;
  }

  const files = fs.readdirSync(rootDir).filter((file) => file.endsWith('.json'));
  let loaded = 0;
  let skipped = 0;
  for (const file of files) {
    const fullPath = path.join(rootDir, file);
    let parsed: any;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      console.warn(`Slate MCP: Failed to parse snippets file ${fullPath}:`, err);
      continue;
    }

    const folders: any[] = parsed?.folders ?? [];
    for (const folder of folders) {
      const snippets: any[] = folder?.snippets ?? [];
      const seenNames = new Map<string, number>();

      for (const snippet of snippets) {
        const baseId = snippet?.shortcut ?? `${file}:${snippet?.name ?? 'snippet'}`;
        const count = seenNames.get(baseId) ?? 0;
        seenNames.set(baseId, count + 1);

        const id = makeId(baseId, count);
        const snippetRecord: SlateSnippet = {
          id,
          name: snippet?.name ?? baseId,
          shortcut: snippet?.shortcut,
          path: path.relative(process.cwd(), fullPath),
          type: snippet?.type,
          text: snippet?.text,
          html: snippet?.html
        };
        if (isValidSnippet(snippetRecord)) {
          catalog.set(id, snippetRecord);
          loaded++;
        } else {
          skipped++;
        }
      }
    }
  }
  appendLog({
    level: 'info',
    category: 'startup',
    message: 'snippet catalog refreshed',
    data: { directory: rootDir, loaded, skipped }
  });
}

export function listSnippets(): SlateSnippet[] {
  return Array.from(catalog.values()).map(({ text, html, ...summary }) => summary);
}

export function getSnippet(id: string): SlateSnippet | undefined {
  return catalog.get(id);
}

// Load snippets once at startup so list/get calls work immediately.
refreshSnippets();

function isValidSnippet(snippet: SlateSnippet): boolean {
  if (!snippet.id || !snippet.name || !snippet.path) {
    return false;
  }
  if (snippet.text && typeof snippet.text !== 'string') {
    return false;
  }
  if (snippet.html && typeof snippet.html !== 'string') {
    return false;
  }
  return true;
}
