import { z } from "zod";

// Re-export all artifact schemas
export * from "./artifacts/index.js";

// Re-export permissions
export * from "./permissions/index.js";

// Re-export errors
export * from "./errors/index.js";

const ArcBaseSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  raw: z.any().optional(),
  model: z.any().optional(),
  operator: z.any().optional(),
  tags: z.array(z.string()).optional()
});

export const CoreArcSchema = ArcBaseSchema.extend({
  category: z.string().optional()
});

export const DomainArcSchema = ArcBaseSchema.extend({
  domain: z.string().optional()
});

export const RegistryEntrySchema = z.object({
  id: z.string(),
  path: z.string(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional()
});

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  actions: z.array(z.string()).optional(),
  defaults: z.record(z.any()).optional(),
  notes: z.string().optional()
});

export const GlossaryEntrySchema = z.object({
  term: z.string(),
  definition: z.string(),
  aliases: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export type CoreArc = z.infer<typeof CoreArcSchema>;
export type DomainArc = z.infer<typeof DomainArcSchema>;
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const CollectionSchemas = {
  core: CoreArcSchema,
  domain: DomainArcSchema,
  registry: RegistryEntrySchema,
  personas: PersonaSchema,
  glossary: GlossaryEntrySchema
};

export type CollectionName = keyof typeof CollectionSchemas;
