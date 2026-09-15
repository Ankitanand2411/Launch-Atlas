import { describe, expect, it } from "vitest";
import { xPostedAt, liPostedAt, parseXStatus, parseLinkedInActivityId } from "@/lib/decode";
import { clock, weekday, minutesOfDay } from "@/lib/time";

// Fixtures verified 2026-09-15 against the embeds on sociallcapital.com/work/*
const FIXTURES = [
  { client: "Gamma", x: "1987880600661889356", xIso: "2025-11-10T13:50:42", li: "7393646492839763968", liIso: "2025-11-10T13:51:31" },
  { client: "Wispr Flow", x: "2025981424470479008", xIso: "2026-02-23T17:09:47", li: "7431748842519318528", liIso: "2026-02-23T17:16:39" },
];

describe("ID → timestamp decoders", () => {
  for (const f of FIXTURES) {
    it(`${f.client}: X snowflake decodes to the embed time`, () => {
      expect(xPostedAt(f.x).toISOString().slice(0, 19)).toBe(f.xIso);
    });
    it(`${f.client}: LinkedIn activity id decodes within minutes of the X post`, () => {
      expect(liPostedAt(f.li).toISOString().slice(0, 19)).toBe(f.liIso);
      const delta = Math.abs(liPostedAt(f.li).getTime() - xPostedAt(f.x).getTime()) / 60000;
      expect(delta).toBeLessThan(10);
    });
  }
  it("accepts bigint or string", () => {
    expect(xPostedAt(1987880600661889356n).getTime()).toBe(xPostedAt("1987880600661889356").getTime());
  });
});

describe("URL parsers", () => {
  it("extracts handle and id from x.com and twitter.com status urls", () => {
    expect(parseXStatus("https://x.com/thisisgrantlee/status/1987880600661889356")).toEqual({ handle: "thisisgrantlee", id: "1987880600661889356" });
    expect(parseXStatus("https://twitter.com/tankots/status/2025981424470479008?s=20")).toEqual({ handle: "tankots", id: "2025981424470479008" });
    expect(parseXStatus("https://x.com/intent/like?tweet_id=1")).toBeNull();
  });
  it("extracts the activity id from linkedin post urls", () => {
    expect(parseLinkedInActivityId("https://www.linkedin.com/posts/grantslee_today-activity-7393646492839763968-Bws-")).toBe("7393646492839763968");
    expect(parseLinkedInActivityId("https://www.linkedin.com/feed/update/urn:li:activity:7393646492839763968")).toBe("7393646492839763968");
    expect(parseLinkedInActivityId("https://www.linkedin.com/in/someone")).toBeNull();
  });
});

describe("time zones", () => {
  const gamma = xPostedAt("1987880600661889356"); // 13:50 UTC, EST in force
  const playerzero = xPostedAt("2036111467016319074"); // 16:02 UTC, EDT in force
  it("is DST-aware for US Eastern", () => {
    expect(clock(gamma, "et")).toBe("08:50");
    expect(clock(playerzero, "et")).toBe("12:02");
  });
  it("renders IST and weekday", () => {
    expect(clock(gamma, "ist")).toBe("19:20");
    expect(weekday(gamma, "et")).toBe("Mon");
    expect(minutesOfDay(gamma, "et")).toBe(8 * 60 + 50);
  });
});
