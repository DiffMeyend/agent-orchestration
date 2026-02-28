import { getEntry, listEntries } from "../data/index.js";
import type { ResourceDescriptor, ResourcePayload } from "./types.js";

export function listEntryResources(): ResourceDescriptor[] {
  return listEntries().map((entry) => ({
    uri: `kb://entries/${entry.id}`,
    name: entry.title,
    description: entry.summary,
    type: "entry" as const
  }));
}

export function getEntryResource(uri: string): ResourcePayload | undefined {
  const match = uri.match(/^kb:\/\/entries\/(?<id>[\w-]+)$/);
  if (!match || !match.groups) {
    return undefined;
  }
  const entry = getEntry(match.groups.id);
  if (!entry) {
    return undefined;
  }
  const descriptor: ResourceDescriptor = {
    uri,
    name: entry.title,
    description: entry.summary,
    type: "entry"
  };
  return {
    descriptor,
    data: entry
  };
}
