import type { Enrichment, HookTags, LaunchSeed } from "@/lib/types";
import { regexTags } from "@/lib/enrich/tags";

/** One path for hook tags: the model's when enrichment has them, otherwise the regex fallback. */
export function getTags(l: LaunchSeed, enrichment: Enrichment[]): HookTags {
  const e = enrichment.find((x) => x.slug === l.slug);
  if (e?.tags) return e.tags;
  return regexTags(l.captionExcerpt);
}

export function getEnrichment(slug: string, enrichment: Enrichment[]): Enrichment | null {
  return enrichment.find((x) => x.slug === slug) ?? null;
}

export const HOOK_LABEL: Record<HookTags["primaryHook"], string> = {
  capital: "capital",
  traction: "traction",
  product: "product",
  story: "story",
  stunt: "stunt",
  other: "other",
};
