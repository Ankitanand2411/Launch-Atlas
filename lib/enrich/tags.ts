import type { HookTags, HookType } from "@/lib/types";
import { tagCaption } from "@/lib/analyze/captions";

export const HOOK_TYPES: HookType[] = ["capital", "traction", "product", "story", "stunt", "other"];

const FIGURE = /\$\s?\d[\d,.]*\s?(?:k|m|b|mm|bn|million|billion)?\b|\b\d[\d,.]*\s?(?:m|b|k)?\+?\s?(?:arr|users|customers|calls|deployments|employees|people)\b|\b\d+x\b|\bseries [a-f]\b|\b\d+(?:\.\d+)?%/i;

/** Regex fallback with the same shape as a model result, so downstream code has one path. */
export function regexTags(caption: string): HookTags {
  const t = tagCaption(caption);
  const lines = caption.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const hooks: HookType[] = [];
  if (t.funding) hooks.push("capital");
  if (t.traction) hooks.push("traction");
  if (t.product) hooks.push("product");
  if (t.story) hooks.push("story");
  if (t.stunt) hooks.push("stunt");
  const first = lines[0] ?? "";
  const primaryHook: HookType = /\bif (?:they|you) (?:could|can)\b|challenge/i.test(first) ? "stunt"
    : /\$|raised|series [a-f]|backed by/i.test(first) ? "capital"
    : /arr|valuation|revenue|calls|customers/i.test(first) ? "traction"
    : /introduc|launch|announc/i.test(first) ? "product"
    : /story|never (?:shared|told)/i.test(first) ? "story"
    : hooks[0] ?? "other";
  const figures = Array.from(caption.matchAll(/\$\s?\d[\d,.]*\s?(?:k|m|b|million|billion)\b(?:\s+(?:valuation|arr|in revenue|series [a-f]))?/gi)).map((m) => m[0].trim());
  return {
    hooks: hooks.length ? hooks : ["other"],
    primaryHook,
    firstLine: first,
    figureInFirstThreeLines: lines.slice(0, 3).some((l) => FIGURE.test(l)),
    capitalFigures: Array.from(new Set(figures)),
    cta: /download now|try it|sign up|get started|link below|learn more/i.test(caption) ? (caption.match(/[^.\n]*(?:download now|try it|sign up|get started|link below|learn more)[^.\n]*/i)?.[0].trim() ?? null) : null,
    founderOnCamera: null,
    confidence: 0.5,
    source: "regex",
    model: null,
  };
}

/** Strict validation of a model response. Returns the cleaned object or a list of problems. */
export function validateTags(raw: unknown, model: string): { ok: true; tags: HookTags } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  const o = (raw ?? {}) as Record<string, unknown>;
  const isHook = (h: unknown): h is HookType => typeof h === "string" && (HOOK_TYPES as string[]).includes(h);
  const hooks = Array.isArray(o.hooks) ? o.hooks.filter(isHook) : [];
  if (!Array.isArray(o.hooks) || hooks.length !== o.hooks.length || hooks.length === 0) problems.push("hooks must be a non-empty array of known hook types");
  if (!isHook(o.primaryHook)) problems.push("primaryHook must be a known hook type");
  if (typeof o.firstLine !== "string" || !o.firstLine.trim()) problems.push("firstLine must be a non-empty string");
  if (typeof o.figureInFirstThreeLines !== "boolean") problems.push("figureInFirstThreeLines must be boolean");
  if (!Array.isArray(o.capitalFigures) || o.capitalFigures.some((f) => typeof f !== "string")) problems.push("capitalFigures must be an array of strings");
  if (o.cta != null && typeof o.cta !== "string") problems.push("cta must be string or null");
  if (o.founderOnCamera != null && typeof o.founderOnCamera !== "boolean") problems.push("founderOnCamera must be boolean or null");
  const confidence = typeof o.confidence === "number" ? o.confidence : NaN;
  if (!(confidence >= 0 && confidence <= 1)) problems.push("confidence must be a number in [0,1]");
  if (problems.length) return { ok: false, problems };
  return {
    ok: true,
    tags: {
      hooks: Array.from(new Set(hooks)),
      primaryHook: o.primaryHook as HookType,
      firstLine: (o.firstLine as string).trim(),
      figureInFirstThreeLines: o.figureInFirstThreeLines as boolean,
      capitalFigures: (o.capitalFigures as string[]).map((s) => s.trim()).filter(Boolean),
      cta: (o.cta as string | null) ?? null,
      founderOnCamera: (o.founderOnCamera as boolean | null) ?? null,
      confidence: Math.round(confidence * 100) / 100,
      source: "model",
      model,
    },
  };
}

/** Strip code fences and find the first JSON object in a model reply. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in model reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export const TAGGING_SYSTEM = `You classify the hooks in a startup launch post. Answer with one JSON object and nothing else.

Hook types:
- capital: a fundraise, round, valuation, or named backers ("raised $100M", "Series B", "backed by Founders Fund")
- traction: revenue, ARR, customers, usage scale, growth, efficiency ("$100M ARR", "500M calls", "$2M per employee")
- product: a product, feature, model or platform being introduced or launched
- story: a founder narrative — origin, struggle, near-death, "never told this before", advice to younger self
- stunt: a challenge, dare, prize, or spectacle ("a Porsche if you can make it fail")
- other: none of the above

Schema:
{"hooks": HookType[], "primaryHook": HookType, "firstLine": string, "figureInFirstThreeLines": boolean,
 "capitalFigures": string[], "cta": string|null, "founderOnCamera": boolean|null, "confidence": number}

Rules: hooks lists every type present in the caption or transcript. primaryHook is what the FIRST LINE of the caption leads with.
figureInFirstThreeLines is true when a money, valuation, revenue, or scale figure appears in the first three lines of the caption.
capitalFigures quotes figures verbatim. cta is the call to action if any. founderOnCamera is null unless frames are provided.
confidence is your own 0–1 estimate. Do not invent text that is not in the inputs.`;
