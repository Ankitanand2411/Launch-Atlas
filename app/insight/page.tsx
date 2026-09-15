import Link from "next/link";
import { analysis, launches } from "@/lib/data";
import { buildInsight } from "@/lib/insight";
import { Verdict } from "@/components/Verdict";

export const metadata = { title: "Insight — Launch Atlas" };

export default function Insight() {
  const ins = buildInsight(analysis, launches);
  const generated = new Date(analysis.generatedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="pt-12 sm:pt-16">
      <p className="text-[15px] text-ink-2">{ins.status === "headline" ? "One insight, from nine public posts" : "Working finding — the timing hypotheses have not all held"}</p>
      <h1 className="mt-3 text-[26px] sm:text-[32px] leading-[1.3] tracking-[-0.01em] font-medium max-w-[52rem]"><span className="marker">{ins.headline}</span></h1>
      <p className="measure mt-6 text-[17px] leading-7 text-ink-2">{ins.lede}</p>

      <section className="mt-14 grid gap-8 md:grid-cols-3">
        {ins.support.map((s) => (
          <div key={s.title} className="border-t border-ink pt-4">
            <h2 className="text-[17px] font-medium leading-6">{s.title}</h2>
            <p className="mt-2 text-[15px] leading-6 text-ink-2">{s.text}</p>
            <Link href={s.href} className="mt-3 inline-block text-[15px] underline hover:text-ink-2">See the evidence</Link>
          </div>
        ))}
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section className="measure">
          <h2 className="section-title">What cuts against it</h2>
          <ul className="mt-3 text-[15px] leading-7 list-disc pl-5">{ins.counter.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
        <section className="measure">
          <h2 className="section-title">Why a launch team would care</h2>
          <ul className="mt-3 text-[15px] leading-7 list-disc pl-5">{ins.whyItMatters.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="mt-3 text-[13px] leading-5 text-ink-2">Interpretation, not measurement: the data shows the pattern; the reasons are inferred.</p>
        </section>
      </div>

      <section className="mt-14">
        <h2 className="section-title">The board</h2>
        <p className="mt-2 text-[15px] leading-6 text-ink-2 measure">Nine hypotheses written before code. Verdicts are computed from the data on this site each time the pipeline runs.</p>
        <ol className="mt-6 divide-y divide-rule border-b border-ink">
          {analysis.hypotheses.map((h) => (
            <li key={h.code} className="py-6 grid gap-3 sm:grid-cols-[56px_minmax(0,1fr)_110px]">
              <span className="num text-[15px] text-ink-2">{h.code}</span>
              <div className="measure">
                <p className="text-[17px] leading-7">{h.statement}</p>
                <p className="mt-2 text-[15px] leading-6 text-ink-2">{h.summary}</p>
              </div>
              <div className="sm:justify-self-end"><Verdict value={h.verdict} /></div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section className="measure">
          <h2 className="section-title">What I would test next</h2>
          <ul className="mt-3 text-[15px] leading-7 list-disc pl-5">{ins.next.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
        <section className="measure">
          <h2 className="section-title">Method and limits</h2>
          <ul className="mt-3 text-[15px] leading-7 list-disc pl-5">{ins.method.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="mt-4 text-[13px] leading-5 text-ink-2">Computed {generated}. Every number above is generated from the analysis file, not typed.</p>
        </section>
      </div>
    </div>
  );
}
