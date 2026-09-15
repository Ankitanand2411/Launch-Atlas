export type Platform = "x" | "linkedin";
export type AuthorType = "founder" | "brand" | "creator";
export type MediaType = "video" | "image" | "text";

/** One launch as listed on sociallcapital.com/work. */
export interface Launch {
  slug: string;
  client: string;
  /** "YYYY-MM" as shown on the work page. */
  month: string;
  sourceUrl: string;
  founderName: string | null;
  founderXHandle: string | null;
  xUrl: string;
  linkedinUrl: string | null;
  notes?: string;
}

/** Raw, hand-verified or crawled seed for a launch (what the case page exposes). */
export interface LaunchSeed extends Launch {
  /** Handle of the account that published the hero X post (founder or brand). */
  authorHandle: string;
  authorType: AuthorType;
  mediaType: MediaType;
  videoUrl: string | null;
  /** Compact strings exactly as shown in the embed, e.g. "2.8K", "405". */
  likesCompact: string | null;
  repliesCompact: string | null;
  /** Caption text visible in the embed, truncated at "Show more" where applicable. */
  captionExcerpt: string;
  captionTruncated: boolean;
  /** Time text shown by the embed (rendered in UTC by the site), for cross-checking decoders. */
  embedTimeText: string | null;
  /** When and how this seed was verified. */
  verifiedAt: string;
  verifiedBy: "case-page-fetch" | "crawler" | "manual";
}

export interface Post {
  id: string;
  launchSlug: string;
  platform: Platform;
  externalId: string;
  url: string;
  /** ISO 8601, derived from the platform ID. Authoritative. */
  postedAtUtc: string;
  authorHandle: string | null;
  authorType: AuthorType;
  authorFollowers: number | null;
  text: string | null;
  textTruncated: boolean;
  views: number | null;
  likes: number | null;
  likesApprox: boolean;
  replies: number | null;
  repliesApprox: boolean;
  reposts: number | null;
  quotes: number | null;
  mediaType: MediaType | null;
  videoUrl: string | null;
  sourceAdapter: string;
  sourceUrl: string;
  fetchedAt: string;
}

export type Verdict = "supported" | "mixed" | "rejected" | "untested";

export interface HypothesisResult {
  code: string;
  statement: string;
  verdict: Verdict;
  summary: string;
  evidence: Record<string, unknown>;
  computedAt: string;
}

export interface TimingRow {
  slug: string;
  client: string;
  xPostedAtUtc: string;
  weekdayUtc: string;
  weekdayEt: string;
  utcClock: string;
  etClock: string;
  ptClock: string;
  istClock: string;
  /** Minutes after midnight, US Eastern (DST-aware). Drives the clock hero. */
  etMinutes: number;
  linkedinPostedAtUtc: string | null;
  linkedinMinusXMin: number | null;
}

export interface EngagementRow {
  slug: string;
  client: string;
  likes: number | null;
  replies: number | null;
  replyRate: number | null;
  mediaType: MediaType | null;
  authorType: AuthorType;
}

export interface Analysis {
  generatedAt: string;
  launchCount: number;
  timing: TimingRow[];
  engagement: EngagementRow[];
  hypotheses: HypothesisResult[];
}
