import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().max(80),
    description: z.string().max(180),
    category: z.enum([
      "discover",
      "start",
      "author",
      "features",
      "customize",
      "operate",
      "reference",
    ]),
    order: z.number().int().nonnegative(),
    badge: z.string().max(24).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { docs };
