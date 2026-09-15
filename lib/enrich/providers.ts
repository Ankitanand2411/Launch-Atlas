/**
 * Thin clients for the two providers the enrichment step can use. Both read keys from env.
 *  - Groq: Whisper transcription (OpenAI-compatible) and Llama chat completions with JSON mode.
 *  - Anthropic: messages API for tagging, with optional frame images.
 * Model names are env-overridable because they change; a 404 on a model means "update the name".
 */
import fs from "node:fs";

export const GROQ_BASE = "https://api.groq.com/openai/v1";
export const ANTHROPIC_BASE = "https://api.anthropic.com/v1";

export const MODELS = {
  whisper: process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo",
  groqChat: process.env.GROQ_CHAT_MODEL ?? "llama-3.3-70b-versatile",
  anthropic: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
};

export type Provider = "groq" | "anthropic";
export function pickProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (p === "anthropic" || p === "groq") return p;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "groq";
}

export async function transcribeWithGroq(filePath: string): Promise<{ text: string; language: string | null; segments: { start: number; end: number; text: string }[]; model: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(filePath)]), filePath.split("/").pop() ?? "video.mp4");
  form.append("model", MODELS.whisper);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`groq transcription ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { text: string; language?: string; segments?: Array<{ start: number; end: number; text: string }> };
  return {
    text: (data.text ?? "").trim(),
    language: data.language ?? null,
    segments: (data.segments ?? []).map((s) => ({ start: Math.round(s.start * 10) / 10, end: Math.round(s.end * 10) / 10, text: s.text.trim() })),
    model: MODELS.whisper,
  };
}

export async function chatJsonWithGroq(system: string, user: string): Promise<{ text: string; model: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODELS.groqChat, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`groq chat ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return { text: data.choices?.[0]?.message?.content ?? "", model: MODELS.groqChat };
}

export async function chatJsonWithAnthropic(system: string, user: string, framePaths: string[] = []): Promise<{ text: string; model: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const content: Array<Record<string, unknown>> = framePaths.map((p) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: fs.readFileSync(p).toString("base64") } }));
  content.push({ type: "text", text: user });
  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELS.anthropic, max_tokens: 800, temperature: 0.1, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  return { text: data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n"), model: MODELS.anthropic };
}
