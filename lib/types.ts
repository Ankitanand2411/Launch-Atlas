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
  amplification: AmplificationRow[];
  roster: RosterOverlap | null;
  claims: ClaimRow[];
  hypotheses: HypothesisResult[];
}

/* ---------- Phase 2: enrichment ---------- */

export type HookType = "capital" | "traction" | "product" | "story" | "stunt" | "other";

export interface HookTags {
  /** Distinct hooks present anywhere in the caption or transcript. */
  hooks: HookType[];
  /** What the first line leads with. */
  primaryHook: HookType;
  firstLine: string;
  /** A money, valuation, revenue, or scale figure appears within the first three lines. */
  figureInFirstThreeLines: boolean;
  /** Verbatim figures, e.g. "$2.1B valuation", "$100M ARR". */
  capitalFigures: string[];
  cta: string | null;
  founderOnCamera: boolean | null;
  /** Model's self-reported confidence, 0–1. Regex tags report 0.5. */
  confidence: number;
  source: "model" | "regex";
  model: string | null;
}

export interface VideoProbe {
  durationS: number;
  width: number;
  height: number;
  fps: number | null;
  hasAudio: boolean;
  aspect: "16:9" | "9:16" | "1:1" | "4:3" | "other";
  bytes: number | null;
  /** The variant that was probed; the case page exposes one rendition, not necessarily the source. */
  variantUrl: string;
}

export interface TranscriptSegment { start: number; end: number; text: string }

export interface Transcript {
  text: string;
  language: string | null;
  segments: TranscriptSegment[];
  model: string;
}

export interface Enrichment {
  slug: string;
  video: VideoProbe | null;
  /** Public paths under /frames, e.g. "/frames/gamma-0.5.jpg". */
  frames: string[];
  transcript: Transcript | null;
  tags: HookTags | null;
  /** Full caption when an override supplied it; otherwise null (excerpt lives on the launch). */
  fullText: string | null;
  enrichedAt: string;
  notes: string[];
}

/* ---------- Stretch: amplification (free sources only) ---------- */

export interface XPostMetrics {
  id: string;
  url: string;
  text: string | null;
  views: number | null;
  likes: number | null;
  reposts: number | null;
  quotes: number | null;
  replies: number | null;
  bookmarks: number | null;
  authorHandle: string | null;
  authorName: string | null;
  authorFollowers: number | null;
  createdAtUtc: string | null;
  /** Highest-bitrate MP4 the endpoint exposes, if any. */
  bestVideoUrl: string | null;
  videoDurationS: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
  /** Set when the post is a reply or a quote of another post. */
  replyToId: string | null;
  quoteOfId: string | null;
  source: "fxtwitter" | "syndication";
  fetchedAt: string;
}

export interface LinkedInPostMetrics {
  activityId: string;
  url: string;
  text: string | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  source: "linkedin-public" | "override";
  fetchedAt: string;
  note?: string;
}

export interface AmplificationRecord {
  slug: string;
  x: XPostMetrics | null;
  linkedin: LinkedInPostMetrics | null;
  notes: string[];
}

export interface AmplificationRow {
  slug: string;
  client: string;
  views: number | null;
  likes: number | null;
  reposts: number | null;
  quotes: number | null;
  replies: number | null;
  bookmarks: number | null;
  authorFollowers: number | null;
  /** quotes / (quotes + reposts): commentary vs. plain amplification. */
  quoteShare: number | null;
  likesPerThousandViews: number | null;
  likesPerThousandFollowers: number | null;
  linkedinReactions: number | null;
  linkedinComments: number | null;
  source: string;
}

export interface RosterEntry {
  launchSlug: string;
  platform: Platform;
  handle: string;
  followers: number | null;
  kind: "quote" | "reply" | "repost" | "standalone";
  url: string | null;
  postedAtUtc: string | null;
}

export interface RosterOverlap {
  entries: number;
  creators: number;
  repeat: { handle: string; platform: Platform; launches: string[]; followers: number | null }[];
  byTier: Record<string, number>;
}

/* ---------- Bonus: positioning claims ---------- */

export interface ClaimRow {
  /** ISO date of the capture when known (Wayback); null for undated third-party observations. */
  date: string | null;
  observedAt: string;
  source: "wayback" | "live-site" | "third-party" | "linkedin-company";
  url: string;
  viewsClaim: string | null;
  creatorsClaim: string | null;
  teamSize: string | null;
  growthClaim: string | null;
  guarantee: boolean | null;
  tagline: string | null;
  note?: string;
}
