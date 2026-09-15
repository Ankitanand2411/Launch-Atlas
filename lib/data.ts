import launchesJson from "@/data/derived/launches.json";
import postsJson from "@/data/derived/posts.json";
import analysisJson from "@/data/derived/analysis.json";
import enrichmentJson from "@/data/derived/enrichment.json";
import type { Analysis, Enrichment, LaunchSeed, Post } from "./types";

export const launches = launchesJson as LaunchSeed[];
export const posts = postsJson as Post[];
export const analysis = analysisJson as Analysis;
export const enrichment = enrichmentJson as Enrichment[];

/** Launches in chronological order of the X hero post. */
export const launchesChronological = [...launches].sort((a, b) => {
  const pa = posts.find((p) => p.launchSlug === a.slug && p.platform === "x")!.postedAtUtc;
  const pb = posts.find((p) => p.launchSlug === b.slug && p.platform === "x")!.postedAtUtc;
  return pa.localeCompare(pb);
});

export const getLaunch = (slug: string) => launches.find((l) => l.slug === slug) ?? null;
export const getPosts = (slug: string) => posts.filter((p) => p.launchSlug === slug);
export const getTiming = (slug: string) => analysis.timing.find((t) => t.slug === slug) ?? null;
export const getEngagement = (slug: string) => analysis.engagement.find((e) => e.slug === slug) ?? null;
export const getEnrichment = (slug: string) => enrichment.find((e) => e.slug === slug) ?? null;

export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? null;

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
