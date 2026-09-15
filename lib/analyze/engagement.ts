import { replyRate } from "@/lib/metrics";
import type { EngagementRow, LaunchSeed, Post } from "@/lib/types";

export function buildEngagement(launches: LaunchSeed[], posts: Post[]): EngagementRow[] {
  return launches.map((l) => {
    const x = posts.find((p) => p.launchSlug === l.slug && p.platform === "x")!;
    return {
      slug: l.slug,
      client: l.client,
      likes: x.likes,
      replies: x.replies,
      replyRate: replyRate(x.replies, x.likes),
      mediaType: x.mediaType,
      authorType: x.authorType,
    };
  });
}
