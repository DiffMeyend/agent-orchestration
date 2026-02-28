import { z } from "zod";
import { getEntry } from "../data/index.js";

export const GetParamsSchema = z.object({
  id: z.string().min(1, "id is required")
});

export type GetParams = z.infer<typeof GetParamsSchema>;

export function runGet(params: GetParams) {
  const entry = getEntry(params.id);
  if (!entry) {
    throw new Error(`KB entry not found: ${params.id}`);
  }
  return { entry };
}
