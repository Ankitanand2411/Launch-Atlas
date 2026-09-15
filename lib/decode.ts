/**
 * Timestamps from platform IDs. No network, no API keys, deterministic.
 *
 * X (Twitter) snowflake: the top 41 bits (id >> 22) are milliseconds since the
 * Twitter epoch 1288834974657 (2010-11-04T01:42:54.657Z).
 *
 * LinkedIn activity IDs: the top 41 bits (id >> 22) are milliseconds since the
 * Unix epoch. Verified against paired X posts on two launches (deltas < 7 min).
 */
export const TWITTER_EPOCH_MS = 1288834974657n;

export function xPostedAt(id: bigint | string): Date {
  const n = typeof id === "string" ? BigInt(id) : id;
  return new Date(Number((n >> 22n) + TWITTER_EPOCH_MS));
}

export function liPostedAt(id: bigint | string): Date {
  const n = typeof id === "string" ? BigInt(id) : id;
  return new Date(Number(n >> 22n));
}

const X_STATUS_RE = /(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{15,25})/;
const LI_ACTIVITY_RE = /activity[-:](\d{15,25})/;

export function parseXStatus(url: string): { handle: string; id: string } | null {
  const m = url.match(X_STATUS_RE);
  return m ? { handle: m[1], id: m[2] } : null;
}

export function parseLinkedInActivityId(url: string): string | null {
  const m = url.match(LI_ACTIVITY_RE);
  return m ? m[1] : null;
}
