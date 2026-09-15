import { describe, expect, it } from "vitest";
import { parseCompact, replyRate, formatCompact } from "@/lib/metrics";

describe("compact metrics", () => {
  it("parses X's compact counts", () => {
    expect(parseCompact("2.8K")).toEqual({ value: 2800, approx: true });
    expect(parseCompact("29.7K")).toEqual({ value: 29700, approx: true });
    expect(parseCompact("1.5M")).toEqual({ value: 1500000, approx: true });
    expect(parseCompact("405")).toEqual({ value: 405, approx: false });
    expect(parseCompact("1,234")).toEqual({ value: 1234, approx: false });
    expect(parseCompact("n/a")).toBeNull();
    expect(parseCompact(null)).toBeNull();
  });
  it("computes reply rate and formats back", () => {
    expect(replyRate(4500, 10800)).toBe(0.417);
    expect(replyRate(1, 0)).toBeNull();
    expect(formatCompact(29700)).toBe("29.7K");
    expect(formatCompact(1500000)).toBe("1.5M");
    expect(formatCompact(null)).toBe("—");
  });
});
