import * as cheerio from "cheerio";
import { parseXStatus, parseLinkedInActivityId } from "@/lib/decode";
import type { LaunchSeed, MediaType } from "@/lib/types";

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

export interface ParsedCasePage {
  client: string | null;
  month: string | null;
  xUrl: string | null;
  authorHandle: string | null;
  linkedinUrl: string | null;
  videoUrl: string | null;
  mediaType: MediaType | null;
  likesCompact: string | null;
  repliesCompact: string | null;
  captionExcerpt: string | null;
  captionTruncated: boolean;
  embedTimeText: string | null;
}

/** "Nov 2025" -> "2025-11" */
export function monthToIso(text: string): string | null {
  const m = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/);
  return m ? `${m[2]}-${MONTHS[m[1]]}` : null;
}

/**
 * Parse one sociallcapital.com/work/{slug} page. Heuristic by design: the page is a
 * Framer export wrapping an X embed. Every field is optional; the seed fills gaps.
 */
export function parseCasePage(html: string): ParsedCasePage {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const client = $("h1").first().text().trim() || null;
  const month = monthToIso(text);

  // Collected inside cheerio callbacks; typed as a record so TS does not narrow to `never`.
  const found: { xUrl: string | null; authorHandle: string | null; linkedinUrl: string | null } = { xUrl: null, authorHandle: null, linkedinUrl: null };
  $("a[href*='/status/']").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const parsed = parseXStatus(href);
    if (parsed && !found.xUrl) {
      found.xUrl = `https://x.com/${parsed.handle}/status/${parsed.id}`;
      found.authorHandle = parsed.handle;
    }
  });
  $("a[href*='linkedin.com/posts/']").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (parseLinkedInActivityId(href) && !found.linkedinUrl) found.linkedinUrl = href.split("?")[0];
  });
  const { xUrl, authorHandle, linkedinUrl } = found;

  const videoMatch = html.match(/https:\/\/video\.twimg\.com\/[^\s"'<>]+\.mp4(?:\?[^\s"'<>]*)?/);
  const videoUrl = videoMatch ? videoMatch[0] : null;
  const mediaType: MediaType | null = videoUrl
    ? "video"
    : /\[Image\]|pbs\.twimg\.com\/media/.test(html) ? "image" : null;

  const likesCompact = $("a[href*='intent/like']").first().text().trim() || null;
  const repliesMatch = text.match(/Read\s+([\d.,]+[KMB]?)\s+repl(?:y|ies)/i);
  const repliesCompact = repliesMatch ? repliesMatch[1] : null;

  const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[AP]M\s*·\s*[A-Z][a-z]{2}\s+\d{1,2},\s*\d{4})/);
  const embedTimeText = timeMatch ? timeMatch[1].replace(/\s+/g, " ") : null;

  let captionExcerpt: string | null = null;
  let captionTruncated = false;
  if (xUrl) {
    const idx = text.lastIndexOf(xUrl);
    if (idx >= 0) {
      let tail = text.slice(idx + xUrl.length);
      const cut = tail.search(/Show more|Watch on X|https:\/\/video\.twimg\.com|\d{1,2}:\d{2}\s*[AP]M\s*·/);
      captionTruncated = /Show more/.test(tail.slice(0, cut >= 0 ? cut + 9 : undefined));
      if (cut >= 0) tail = tail.slice(0, cut);
      captionExcerpt = tail.trim() || null;
    }
  }

  return {
    client, month, xUrl, authorHandle, linkedinUrl, videoUrl, mediaType,
    likesCompact, repliesCompact, captionExcerpt, captionTruncated, embedTimeText,
  };
}

/** Parse the /work index: returns slugs in page order with client + month. */
export function parseWorkIndex(html: string): { slug: string; client: string; month: string | null }[] {
  const $ = cheerio.load(html);
  const out: { slug: string; client: string; month: string | null }[] = [];
  $("a[href*='/work/']").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const m = href.match(/\/work\/([a-z0-9-]+)\/?$/i);
    if (!m) return;
    const label = $(a).text().replace(/\s+/g, " ").trim();
    // The index renders "GammaNov 2025" with no separator, so no leading word boundary here.
    const mm = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\s*$/);
    const month = mm ? `${mm[2]}-${MONTHS[mm[1]]}` : null;
    const client = mm ? label.slice(0, mm.index).trim() : label;
    if (!out.some((o) => o.slug === m[1])) out.push({ slug: m[1], client, month });
  });
  return out;
}

/** Merge crawler output over a seed; the seed wins only where the crawler found nothing. */
export function mergeWithSeed(parsed: ParsedCasePage, seed: LaunchSeed | undefined, slug: string, sourceUrl: string): LaunchSeed {
  const pick = <T,>(a: T | null | undefined, b: T | null | undefined): T | null => (a ?? b ?? null);
  const xUrl = pick(parsed.xUrl, seed?.xUrl);
  if (!xUrl) throw new Error(`No X post found for ${slug} and no seed to fall back on`);
  return {
    slug,
    client: pick(parsed.client, seed?.client) ?? slug,
    month: pick(parsed.month, seed?.month) ?? "unknown",
    sourceUrl,
    founderName: seed?.founderName ?? null,
    founderXHandle: seed?.founderXHandle ?? null,
    authorHandle: pick(parsed.authorHandle, seed?.authorHandle) ?? "unknown",
    authorType: seed?.authorType ?? "founder",
    xUrl,
    linkedinUrl: pick(parsed.linkedinUrl, seed?.linkedinUrl),
    mediaType: pick(parsed.mediaType, seed?.mediaType) ?? "text",
    videoUrl: pick(parsed.videoUrl, seed?.videoUrl),
    likesCompact: pick(parsed.likesCompact, seed?.likesCompact),
    repliesCompact: pick(parsed.repliesCompact, seed?.repliesCompact),
    captionExcerpt: pick(parsed.captionExcerpt, seed?.captionExcerpt) ?? "",
    captionTruncated: parsed.captionExcerpt ? parsed.captionTruncated : (seed?.captionTruncated ?? false),
    embedTimeText: pick(parsed.embedTimeText, seed?.embedTimeText),
    notes: seed?.notes,
    verifiedAt: new Date().toISOString().slice(0, 10),
    verifiedBy: "crawler",
  };
}
