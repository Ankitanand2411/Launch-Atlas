"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LaunchReading } from "@/lib/read";
import { extractIds } from "@/lib/read";
import { formatCompact } from "@/lib/metrics";
import { formatDuration } from "@/lib/enrich/ffprobe";
import { WaveStrip } from "@/components/WaveStrip";

const humanMinutes = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round((m / 60) * 10) / 10} h` : `${Math.round((m / 1440) * 10) / 10} d`);

const EXAMPLES = [
  { label: "Gamma, Nov 2025", url: "https://x.com/thisisgrantlee/status/1987880600661889356" },
  { label: "Wispr Flow, Feb 2026", url: "https://x.com/tankots/status/2025981424470479008" },
  { label: "Airwallex, Dec 2025", url: "https://x.com/awxjack/status/1998015620072587516" },
];

function Reader() {
  const params = useSearchParams();
  const [text, setText] = useState("");
  const [state, setState] = useState<{ loading: boolean; result: LaunchReading | null; error: string | null }>({ loading: false, result: null, error: null });
  const [copied, setCopied] = useState(false);
  const ran = useRef(false);

  async function run(input: string) {
    setState({ loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input }) });
      const data = (await res.json()) as LaunchReading & { error?: string };
      if (!res.ok) setState({ loading: false, result: null, error: data.error ?? "Something went wrong." });
      else {
        setState({ loading: false, result: data, error: null });
        const ids = data.posts.map((p) => p.id).join(",");
        window.history.replaceState(null, "", `/analyze?ids=${ids}`);
      }
    } catch {
      setState({ loading: false, result: null, error: "The request did not complete. Check the links and try again." });
    }
  }

  useEffect(() => {
    const ids = params.get("ids");
    if (ids && !ran.current) {
      ran.current = true;
      const lines = ids.split(",").filter((s) => /^\d{15,25}$/.test(s)).map((id) => `https://x.com/i/status/${id}`).join("\n");
      setText(lines);
      run(lines);
    }
  }, [params]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const r = state.result;
  const count = extractIds(text).length;

  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="display">Read a launch</h1>
      <p className="measure mt-4 text-[17px] leading-7 text-ink-2">
        Paste the founder's post, or the founder's post and every creator post that amplified it, one link per line. Posting times are decoded from the links themselves; counts and text come from free public endpoints when they answer.
      </p>
      <div className="mt-8 max-w-[760px]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"https://x.com/founder/status/…\nhttps://x.com/creator/status/…"}
          rows={5}
          className="w-full px-3 py-2 border border-ink bg-paper text-[15px] leading-6 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          aria-label="Links to posts on X, one per line"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={() => run(text)} disabled={!count || state.loading} className="h-11 px-5 bg-ink text-paper text-[15px] disabled:opacity-40">
            {state.loading ? "Reading" : count > 1 ? `Read ${count} posts as one launch` : "Read this post"}
          </button>
          {r && <button onClick={copyLink} className="h-11 px-4 border border-ink text-[15px]">{copied ? "Link copied" : "Copy link to this reading"}</button>}
        </div>
        <p className="mt-3 text-[13px] leading-5 text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Or start with one of the nine:</span>
          {EXAMPLES.map((e) => <button key={e.url} onClick={() => { setText(e.url); run(e.url); }} disabled={state.loading} className="underline hover:text-ink disabled:opacity-40">{e.label}</button>)}
          <span>then add the posts from its Quotes tab.</span>
        </p>
      </div>
      {state.error && <p className="mt-4 text-[15px] leading-6">{state.error}</p>}

      {r && (
        <div className="mt-12">
          {r.amplifiers.length > 0 && (
            <section>
              <h2 className="section-title">How it travelled</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 text-[15px] num">
                {[
                  ["Posts", String(r.totals.posts)],
                  ["Views, all posts", formatCompact(r.totals.views)],
                  ["Median time after founder", humanMinutes(r.waveMedianMin)],
                  ["Quotes / replies / standalone", `${r.kinds.quote} / ${r.kinds.reply} / ${r.kinds.standalone}`],
                  ["Creators", String(r.roster.length)],
                ].map(([k, v]) => (
                  <div key={k} className="py-3 border-b border-rule"><div className="text-[13px] text-ink-2">{k}</div><div className="text-[17px]">{v}</div></div>
                ))}
              </div>
              <div className="mt-6"><WaveStrip amplifiers={r.amplifiers} /></div>
              <div className="mt-6 overflow-x-auto">
                <table className="grid-table">
                  <thead><tr><th>Creator</th><th>Kind</th><th className="n">After founder</th><th className="n">Followers</th><th className="n">Views</th><th className="n">Likes</th><th className="n">Replies</th></tr></thead>
                  <tbody>
                    {r.amplifiers.map((a) => (
                      <tr key={a.id}>
                        <td><a className="underline hover:text-ink-2" href={a.url}>@{a.handle ?? "unknown"}</a></td>
                        <td>{a.kind}</td>
                        <td className="n">{humanMinutes(a.minutesAfterHero)}</td>
                        <td className="n">{formatCompact(a.metrics?.authorFollowers ?? null)}</td>
                        <td className="n">{formatCompact(a.metrics?.views ?? null)}</td>
                        <td className="n">{formatCompact(a.metrics?.likes ?? null)}</td>
                        <td className="n">{formatCompact(a.metrics?.replies ?? null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.notes.length > 0 && <ul className="mt-3 text-[13px] leading-5 text-ink-2">{r.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </section>
          )}

          <section className={r.amplifiers.length ? "mt-14" : ""}>
            <h2 className="section-title">{r.amplifiers.length ? "The founder's post" : `@${r.hero.handle ?? "unknown"}`}</h2>
            <div className="mt-4 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div>
                {r.hero.text ? <blockquote className="whitespace-pre-wrap text-[17px] leading-7 measure">{r.hero.text}</blockquote> : <p className="text-[15px] leading-6 text-ink-2">Text unavailable from the free endpoints.</p>}
                {r.hero.note && <p className="mt-3 text-[13px] leading-5 text-ink-2">{r.hero.note}</p>}
                {r.hero.tags && (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {r.hero.tags.hooks.map((h) => <li key={h} className={`rounded-full px-2.5 py-0.5 text-[13px] ${h === r.hero.tags!.primaryHook ? "bg-ink text-paper" : "bg-surface"}`}>{h}{h === r.hero.tags!.primaryHook ? ", leads" : ""}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 text-[15px] num">
                  {[["Eastern", `${r.hero.weekdayEt} ${r.hero.et}`], ["UTC", r.hero.utc], ["India", r.hero.ist], ["Video", !r.hero.metrics ? "unknown" : r.hero.metrics.videoDurationS ? `${formatDuration(r.hero.metrics.videoDurationS)}${r.hero.metrics.videoWidth ? `, ${r.hero.metrics.videoWidth}×${r.hero.metrics.videoHeight}` : ""}` : "none"]].map(([k, v]) => (
                    <div key={k} className="py-3 border-b border-rule"><div className="text-[13px] text-ink-2">{k}</div><div>{v}</div></div>
                  ))}
                </div>
                {r.hero.metrics && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 text-[15px] num">
                    {[["Views", r.hero.metrics.views], ["Likes", r.hero.metrics.likes], ["Reposts", r.hero.metrics.reposts], ["Quotes", r.hero.metrics.quotes], ["Replies", r.hero.metrics.replies], ["Followers", r.hero.metrics.authorFollowers]].map(([k, v]) => (
                      <div key={k as string} className="py-3 border-b border-rule"><div className="text-[13px] text-ink-2">{k as string}</div><div>{formatCompact(v as number | null)}</div></div>
                    ))}
                  </div>
                )}
                <h3 className="section-title mt-8">Against the nine</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-2">{r.fingerprint.score} of {r.fingerprint.max} checks match Social Capital's pattern. A reading, not a verdict.</p>
                <ul className="mt-3 divide-y divide-rule border-b border-ink">
                  {r.fingerprint.checks.map((c) => (
                    <li key={c.label} className="py-2.5 flex items-start gap-3 text-[15px] leading-6">
                      <span className={`mt-2 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${c.pass == null ? "border border-rule" : c.pass ? "bg-ink" : "border border-ink"}`} />
                      <span className="flex-1">{c.label}</span>
                      <span className="text-ink-2 text-[13px] text-right">{c.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return <Suspense fallback={<div className="pt-16 text-[15px] text-ink-2">Loading</div>}><Reader /></Suspense>;
}
