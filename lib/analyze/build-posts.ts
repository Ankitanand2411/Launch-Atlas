import fs from "node:fs";
import path from "node:path";
import { parseXStatus, parseLinkedInActivityId, xPostedAt, liPostedAt } from "@/lib/decode";
import { isoNoMs } from "@/lib/time";
import { parseCompact } from "@/lib/metrics";
import type { LaunchSeed, Post } from "@/lib/types";

interface Override {
  text?: string;
  views?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  authorFollowers?: number;
  sourceUrl?: string;
  fetchedAt?: string;
}

function loadOverride(root: string, platform: "x" | "linkedin", id: string): Override | null {
  const file = path.join(root, "data/overrides", platform, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Override;
}

/** Build posts from launch seeds. Timestamps come from IDs; metrics from the case page unless an override exists. */
export function buildPosts(launches: LaunchSeed[], root = process.cwd(), now = new Date()): Post[] {
  const posts: Post[] = [];
  const fetchedAt = isoNoMs(now);

  for (const l of launches) {
    const x = parseXStatus(l.xUrl);
    if (!x) throw new Error(`Bad X url for ${l.slug}: ${l.xUrl}`);
    const xo = loadOverride(root, "x", x.id);
    const likes = parseCompact(l.likesCompact);
    const replies = parseCompact(l.repliesCompact);
    posts.push({
      id: `x:${x.id}`,
      launchSlug: l.slug,
      platform: "x",
      externalId: x.id,
      url: l.xUrl,
      postedAtUtc: isoNoMs(xPostedAt(x.id)),
      authorHandle: l.authorHandle,
      authorType: l.authorType,
      authorFollowers: xo?.authorFollowers ?? null,
      text: xo?.text ?? l.captionExcerpt ?? null,
      textTruncated: xo?.text ? false : l.captionTruncated,
      views: xo?.views ?? null,
      likes: xo?.likes ?? likes?.value ?? null,
      likesApprox: xo?.likes != null ? false : likes?.approx ?? true,
      replies: xo?.replies ?? replies?.value ?? null,
      repliesApprox: xo?.replies != null ? false : replies?.approx ?? true,
      reposts: xo?.reposts ?? null,
      quotes: xo?.quotes ?? null,
      mediaType: l.mediaType,
      videoUrl: l.videoUrl,
      sourceAdapter: xo ? "override" : "socap-case-page",
      sourceUrl: xo?.sourceUrl ?? l.sourceUrl,
      fetchedAt: xo?.fetchedAt ?? fetchedAt,
    });

    if (l.linkedinUrl) {
      const liId = parseLinkedInActivityId(l.linkedinUrl);
      if (!liId) throw new Error(`Bad LinkedIn url for ${l.slug}: ${l.linkedinUrl}`);
      const lo = loadOverride(root, "linkedin", liId);
      posts.push({
        id: `linkedin:${liId}`,
        launchSlug: l.slug,
        platform: "linkedin",
        externalId: liId,
        url: l.linkedinUrl,
        postedAtUtc: isoNoMs(liPostedAt(liId)),
        authorHandle: null,
        authorType: l.authorType,
        authorFollowers: lo?.authorFollowers ?? null,
        text: lo?.text ?? null,
        textTruncated: !lo?.text,
        views: lo?.views ?? null,
        likes: lo?.likes ?? null,
        likesApprox: false,
        replies: lo?.replies ?? null,
        repliesApprox: false,
        reposts: lo?.reposts ?? null,
        quotes: null,
        mediaType: null,
        videoUrl: null,
        sourceAdapter: lo ? "override" : "id-decode-only",
        sourceUrl: lo?.sourceUrl ?? l.sourceUrl,
        fetchedAt: lo?.fetchedAt ?? fetchedAt,
      });
    }
  }
  return posts;
}
