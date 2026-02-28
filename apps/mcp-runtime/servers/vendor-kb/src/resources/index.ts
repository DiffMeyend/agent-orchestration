import { getCategoryResource, listCategoryResources } from "./categories.js";
import { getEntryResource, listEntryResources } from "./entries.js";
import type { ResourcePayload } from "./types.js";

export function listResources() {
  return [...listEntryResources(), ...listCategoryResources()];
}

export function readResource(uri: string): ResourcePayload | undefined {
  if (uri.startsWith("kb://entries/")) {
    return getEntryResource(uri);
  }
  if (uri.startsWith("kb://categories/")) {
    return getCategoryResource(uri);
  }
  return undefined;
}
