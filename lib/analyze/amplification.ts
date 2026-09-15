import fs from "node:fs";
import path from "node:path";
import type { AmplificationRecord, AmplificationRow, LaunchSeed, Post, RosterOverlap } from "@/lib/types";
import { parseRosterCsv, overlap } from "@/lib/amplify/roster";

const ratio = (a: number | null, b: number | null, scale = 1) => (a == null || b == null || b === 0 ? null : Math.round((a / b) * scale * 1000) / 1000);

export function buildAmplification(launches: LaunchSeed[], records: AmplificationRecord[], posts: Post[]): AmplificationRow[] {
  return launches.map((l) => {
    const r = records.find((x) => x.slug === l.slug);
    const post = posts.find((p) => p.launchSlug === l.slug && p.platform === "x")!;
    const x = r?.x ?? null;
    const likes = x?.likes ?? post.likes;
    const replies = x?.replies ?? post.replies;
    return {
      slug: l.slug,
      client: l.client,
      views: x?.views ?? null,
      likes,
      reposts: x?.reposts ?? null,
      quotes: x?.quotes ?? null,
      replies,
      bookmarks: x?.bookmarks ?? null,
      authorFollowers: x?.authorFollowers ?? null,
      quoteShare: x?.quotes != null && x?.reposts != null ? ratio(x.quotes, x.quotes + x.reposts) : null,
      likesPerThousandViews: ratio(likes, x?.views ?? null, 1000),
      likesPerThousandFollowers: ratio(likes, x?.authorFollowers ?? null, 1000),
      linkedinReactions: r?.linkedin?.reactions ?? null,
      linkedinComments: r?.linkedin?.comments ?? null,
      source: x ? x.source : post.sourceAdapter,
    };
  });
}

/** Apply exact X counts (and full text) over the case-page approximations. Human overrides still win. */
export function applyAmplificationToPosts(posts: Post[], records: AmplificationRecord[]): Post[] {
  return posts.map((p) => {
    if (p.platform !== "x" || p.sourceAdapter === "override") return p;
    const x = records.find((r) => r.slug === p.launchSlug)?.x;
    if (!x) return p;
    return {
      ...p,
      text: x.text ?? p.text,
      textTruncated: x.text ? false : p.textTruncated,
      views: x.views ?? p.views,
      likes: x.likes ?? p.likes,
      likesApprox: x.likes != null ? false : p.likesApprox,
      replies: x.replies ?? p.replies,
      repliesApprox: x.replies != null ? false : p.repliesApprox,
      reposts: x.reposts ?? p.reposts,
      quotes: x.quotes ?? p.quotes,
      authorFollowers: x.authorFollowers ?? p.authorFollowers,
      videoUrl: x.bestVideoUrl ?? p.videoUrl,
      sourceAdapter: x.source,
      sourceUrl: x.url,
      fetchedAt: x.fetchedAt,
    };
  });
}

export function loadRoster(root = process.cwd()): RosterOverlap | null {
  const file = path.join(root, "data/manual/amplifiers.csv");
  if (!fs.existsSync(file)) return null;
  const entries = parseRosterCsv(fs.readFileSync(file, "utf8"));
  return entries.length ? overlap(entries) : null;
}
