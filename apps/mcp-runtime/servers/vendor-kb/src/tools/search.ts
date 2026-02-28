import { z } from "zod";
import { searchEntries } from "../data/index.js";

export const SearchParamsSchema = z.object({
  query: z.string().min(1, "query is required"),
  category: z.string().optional(),
  limit: z.number().int().positive().max(20).optional()
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export function runSearch(params: SearchParams) {
  const limit = params.limit ?? 5;
  const results = searchEntries(params.query, params.category, limit);
  return {
    results
  };
}
