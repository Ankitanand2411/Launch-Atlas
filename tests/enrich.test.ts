import { describe, expect, it } from "vitest";
import { parseFfprobe, aspectOf, formatDuration } from "@/lib/enrich/ffprobe";
import { regexTags, validateTags, extractJson } from "@/lib/enrich/tags";

const FFPROBE = JSON.stringify({
  format: { duration: "94.361000", size: "18234511" },
  streams: [
    { codec_type: "video", width: 1280, height: 720, r_frame_rate: "30000/1001", avg_frame_rate: "30000/1001" },
    { codec_type: "audio", sample_rate: "44100" },
  ],
});

describe("ffprobe parsing", () => {
  it("reads duration, frame size, fps, audio and aspect", () => {
    const v = parseFfprobe(FFPROBE, "https://video.twimg.com/x.mp4");
    expect(v.durationS).toBe(94.4);
    expect(v.width).toBe(1280);
    expect(v.aspect).toBe("16:9");
    expect(v.fps).toBe(29.97);
    expect(v.hasAudio).toBe(true);
    expect(v.bytes).toBe(18234511);
  });
  it("classifies aspect ratios and formats durations", () => {
    expect(aspectOf(1080, 1920)).toBe("9:16");
    expect(aspectOf(1080, 1080)).toBe("1:1");
    expect(aspectOf(1920, 1080)).toBe("16:9");
    expect(aspectOf(1000, 300)).toBe("other");
    expect(formatDuration(94.4)).toBe("1:34");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("regex tags (fallback in the model's shape)", () => {
  it("tags a capital-led founder story", () => {
    const t = regexTags("Deel has raised $300M at a $17.3B valuation\n\nWe started about 6 years ago, struggling to even make $10K.\n\nI’ve never shared this before because of how embarrassing our start was.");
    expect(t.hooks).toContain("capital");
    expect(t.hooks).toContain("story");
    expect(t.primaryHook).toBe("capital");
    expect(t.figureInFirstThreeLines).toBe(true);
    expect(t.capitalFigures).toContain("$300M");
    expect(t.source).toBe("regex");
  });
  it("tags a stunt hook and a product launch without a figure up front", () => {
    expect(regexTags("We offered 5 people a Porsche 911 GT3 RS if they could get @WisprFlow to make a mistake\n\nToday, we’re finally launching on Android. Download now:").primaryHook).toBe("stunt");
    const icon = regexTags("Excited to introduce Icon, The First AI Admaker.\n\nWe’re backed by Peter Thiel’s Founders Fund & execs of frontier AI labs.\n\nIcon is like ChatGPT + CapCut, but for ads.");
    expect(icon.primaryHook).toBe("product");
    expect(icon.figureInFirstThreeLines).toBe(false);
  });
});

describe("model output validation", () => {
  const good = { hooks: ["capital", "product"], primaryHook: "capital", firstLine: "We've raised $100M", figureInFirstThreeLines: true, capitalFigures: ["$100M"], cta: null, founderOnCamera: null, confidence: 0.9 };
  it("accepts a well-formed object and stamps the model", () => {
    const v = validateTags(good, "test-model");
    expect(v.ok).toBe(true);
    if (v.ok) { expect(v.tags.source).toBe("model"); expect(v.tags.model).toBe("test-model"); }
  });
  it("rejects unknown hook types, bad confidence and missing fields", () => {
    expect(validateTags({ ...good, hooks: ["capital", "vibes"] }, "m").ok).toBe(false);
    expect(validateTags({ ...good, confidence: 1.7 }, "m").ok).toBe(false);
    expect(validateTags({ ...good, firstLine: "" }, "m").ok).toBe(false);
    expect(validateTags({ ...good, primaryHook: "funding" }, "m").ok).toBe(false);
  });
  it("extracts JSON from fenced or chatty replies", () => {
    expect(extractJson('Sure! ```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson("no json here")).toThrow();
  });
});
