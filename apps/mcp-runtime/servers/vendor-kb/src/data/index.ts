import { KB_ENTRIES, type KBEntry } from "./entries.js";

export type SearchResult = {
  id: string;
  title: string;
  summary: string;
  category: string;
  vendor: string;
  tags: string[];
  score: number;
};

export function listEntries(): KBEntry[] {
  return KB_ENTRIES.slice();
}

export function getEntry(id: string): KBEntry | undefined {
  return KB_ENTRIES.find((entry) => entry.id === id);
}

export function searchEntries(query: string, category?: string, limit: number = 5): SearchResult[] {
  const normalizedQuery = query.toLowerCase();
  const filtered = KB_ENTRIES.filter((entry) => {
    if (category && entry.category !== category) {
      return false;
    }
    const haystack = [entry.title, entry.summary, entry.body, entry.vendor, entry.tags.join(" ")].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const scored = filtered.map<SearchResult>((entry) => {
    const score = computeScore(entry, normalizedQuery);
    return {
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      category: entry.category,
      vendor: entry.vendor,
      tags: entry.tags,
      score
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function computeScore(entry: KBEntry, query: string): number {
  let score = 0;
  const q = query.toLowerCase();
  if (entry.title.toLowerCase().includes(q)) score += 3;
  if (entry.summary.toLowerCase().includes(q)) score += 2;
  if (entry.body.toLowerCase().includes(q)) score += 1;
  if (entry.tags.some((tag) => tag.toLowerCase().includes(q))) score += 1;
  return score;
}

export function listCategories(): string[] {
  return Array.from(new Set(KB_ENTRIES.map((entry) => entry.category))).sort();
}

export function getEntriesByCategory(category: string): KBEntry[] {
  return KB_ENTRIES.filter((entry) => entry.category === category);
}
