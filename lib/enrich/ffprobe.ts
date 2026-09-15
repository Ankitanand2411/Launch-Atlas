import type { VideoProbe } from "@/lib/types";

/** Nearest common aspect ratio for a frame size. */
export function aspectOf(width: number, height: number): VideoProbe["aspect"] {
  if (!width || !height) return "other";
  const r = width / height;
  const near = (target: number) => Math.abs(r - target) < 0.04;
  if (near(16 / 9)) return "16:9";
  if (near(9 / 16)) return "9:16";
  if (near(1)) return "1:1";
  if (near(4 / 3)) return "4:3";
  return "other";
}

function parseRate(rate: string | undefined): number | null {
  if (!rate) return null;
  const [a, b] = rate.split("/").map(Number);
  if (!a) return null;
  const v = b ? a / b : a;
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}

/** Parse `ffprobe -print_format json -show_format -show_streams` output. */
export function parseFfprobe(json: string, variantUrl: string): VideoProbe {
  const data = JSON.parse(json) as { format?: { duration?: string; size?: string }; streams?: Array<{ codec_type?: string; width?: number; height?: number; r_frame_rate?: string; avg_frame_rate?: string }> };
  const streams = data.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video");
  const a = streams.find((s) => s.codec_type === "audio");
  if (!v) throw new Error("ffprobe: no video stream");
  const width = v.width ?? 0;
  const height = v.height ?? 0;
  return {
    durationS: Math.round(Number(data.format?.duration ?? 0) * 10) / 10,
    width,
    height,
    fps: parseRate(v.avg_frame_rate) ?? parseRate(v.r_frame_rate),
    hasAudio: Boolean(a),
    aspect: aspectOf(width, height),
    bytes: data.format?.size ? Number(data.format.size) : null,
    variantUrl,
  };
}

export function formatDuration(s: number | null | undefined): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s - m * 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
