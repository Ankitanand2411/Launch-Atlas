"use client";

import { useState } from "react";
import type { HookTags, XPostMetrics } from "@/lib/types";
import type { Fingerprint } from "@/lib/fingerprint";
import { formatCompact } from "@/lib/metrics";

interface Result {
  id: string;
  handle: string;
  decoded: { postedAtUtc: string; weekdayEt: string; et: string; utc: string; pt: string; ist: string };
  metrics: XPostMetrics | null;
  text: string | null;
  tags: HookTags | null;
  fingerprint: Fingerprint;
  note: string | null;
  error?: string;
}

export default function Analyze() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<{ loading: boolean; result: Result | null; error: string | null }>({ loading: false, result: null, error: null });

  const examples = [
    { label: "Gamma, Nov 2025", url: "https://x.com/thisisgrantlee/status/1987880600661889356" },
    { label: "Wispr Flow, Feb 2026", url: "https://x.com/tankots/status/2025981424470479008" },
    { label: "Airwallex, Dec 2025", url: "https://x.com/awxjack/status/1998015620072587516" },
  ];

  async function run(target = url) {
    if (target !== url) setUrl(target);
    setState({ loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/anatomy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: target }) });
      const data = (await res.json()) as Result;
      if (!res.ok) setState({ loading: false, result: null, error: data.error ?? "Something went wrong." });
      else setState({ loading: false, result: data, error: null });
    } catch {
      setState({ loading: false, result: null, error: "The request did not complete. Check the link and try again." });
    }
  }

  const r = state.result;
  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="display">Read any launch post</h1>
      <p className="measure mt-4 text-[17px] leading-7 text-ink-2">
        Paste a link to a post on X. The posting time is decoded from the ID; counts and text come from free public endpoints when they answer. The result is compared with the pattern read off Social Capital's nine launches.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-[720px]">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && url && run(url)}
          placeholder="https://x.com/handle/status/…"
          className="flex-1 h-11 px-3 border border-ink bg-paper text-[15px] rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          aria-label="Link to a post on X"
        />
        <button onClick={() => run(url)} disabled={!url || state.loading} className="h-11 px-5 bg-ink text-paper text-[15px] disabled:opacity-40">
          {state.loading ? "Reading" : "Read this post"}
        </button>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>Or try one of the nine:</span>
        {examples.map((e) => (
          <button key={e.url} onClick={() => run(e.url)} disabled={state.loading} className="underline hover:text-ink disabled:opacity-40">{e.label}</button>
        ))}
        <span>— then paste a launch they have not run.</span>
      </p>
      {state.error && <p className="mt-4 text-[15px] leading-6">{state.error}</p>}

      {r && (
        <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section>
            <h2 className="section-title">@{r.handle}</h2>
            {r.text ? <blockquote className="mt-4 whitespace-pre-wrap text-[17px] leading-7 measure">{r.text}</blockquote> : <p className="mt-4 text-[15px] leading-6 text-ink-2">Text unavailable from the free endpoints.</p>}
            {r.note && <p className="mt-3 text-[13px] leading-5 text-ink-2">{r.note}</p>}
            {r.tags && (
              <div className="mt-8">
                <h3 className="text-[15px] font-medium">Hooks</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.tags.hooks.map((h) => <li key={h} className={`rounded-full px-2.5 py-0.5 text-[13px] ${h === r.tags!.primaryHook ? "bg-ink text-paper" : "bg-surface"}`}>{h}{h === r.tags!.primaryHook ? ", leads" : ""}</li>)}
                </ul>
              </div>
            )}
          </section>
          <section>
            <h2 className="section-title">When it fired</h2>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 text-[15px] num">
              {[["Eastern", `${r.decoded.weekdayEt} ${r.decoded.et}`], ["Pacific", r.decoded.pt], ["UTC", r.decoded.utc], ["India", r.decoded.ist]].map(([k, v]) => (
                <div key={k} className="py-3 border-b border-rule"><div className="text-[13px] text-ink-2">{k}</div><div>{v}</div></div>
              ))}
            </div>
            {r.metrics && (
              <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 text-[15px] num">
                {[["Views", r.metrics.views], ["Likes", r.metrics.likes], ["Reposts", r.metrics.reposts], ["Quotes", r.metrics.quotes], ["Replies", r.metrics.replies], ["Followers", r.metrics.authorFollowers]].map(([k, v]) => (
                  <div key={k as string} className="py-3 border-b border-rule"><div className="text-[13px] text-ink-2">{k as string}</div><div>{formatCompact(v as number | null)}</div></div>
                ))}
              </div>
            )}
            <h2 className="section-title mt-10">Against the nine</h2>
            <p className="mt-1 text-[13px] leading-5 text-ink-2">{r.fingerprint.score} of {r.fingerprint.max} checks match. A reading, not a verdict.</p>
            <ul className="mt-3 divide-y divide-rule border-b border-ink">
              {r.fingerprint.checks.map((c) => (
                <li key={c.label} className="py-2.5 flex items-start gap-3 text-[15px] leading-6">
                  <span className={`mt-2 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${c.pass == null ? "border border-rule" : c.pass ? "bg-ink" : "border border-ink"}`} aria-label={c.pass == null ? "unknown" : c.pass ? "matches" : "does not match"} />
                  <span className="flex-1">{c.label}</span>
                  <span className="text-ink-2 text-[13px] text-right">{c.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
