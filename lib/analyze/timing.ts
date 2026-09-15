import { clock, weekday, minutesOfDay, diffMinutes } from "@/lib/time";
import type { LaunchSeed, Post, TimingRow } from "@/lib/types";

export function buildTiming(launches: LaunchSeed[], posts: Post[]): TimingRow[] {
  return launches.map((l) => {
    const x = posts.find((p) => p.launchSlug === l.slug && p.platform === "x");
    if (!x) throw new Error(`No X post for ${l.slug}`);
    const li = posts.find((p) => p.launchSlug === l.slug && p.platform === "linkedin") ?? null;
    const xd = new Date(x.postedAtUtc);
    const lid = li ? new Date(li.postedAtUtc) : null;
    return {
      slug: l.slug,
      client: l.client,
      xPostedAtUtc: x.postedAtUtc,
      weekdayUtc: weekday(xd, "utc"),
      weekdayEt: weekday(xd, "et"),
      utcClock: clock(xd, "utc"),
      etClock: clock(xd, "et"),
      ptClock: clock(xd, "pt"),
      istClock: clock(xd, "ist"),
      etMinutes: minutesOfDay(xd, "et"),
      linkedinPostedAtUtc: li?.postedAtUtc ?? null,
      linkedinMinusXMin: lid ? diffMinutes(lid, xd) : null,
    };
  });
}
