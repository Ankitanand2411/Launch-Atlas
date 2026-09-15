import { analysis } from "@/lib/data";
import { Verdict } from "@/components/Verdict";

export const metadata = { title: "Insight — Launch Atlas" };

export default function Insight() {
  const generated = new Date(analysis.generatedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="display">Nine hypotheses, one insight</h1>
      <p className="measure mt-4 text-[17px] leading-7 text-ink-2">
        The tool exists to test these. Verdicts are computed from the data on this site, not written by hand. The headline insight is chosen in Phase 4, after transcripts tighten the hook tags.
      </p>
      <ol className="mt-10 divide-y divide-rule border-b border-ink">
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
      <section className="mt-12 measure">
        <h2 className="section-title">Method and limits</h2>
        <ul className="mt-3 text-[15px] leading-7 list-disc pl-5">
          <li>Timestamps are decoded from post IDs, so they are exact to the second and need no API.</li>
          <li>Likes and replies are the rounded counts in the embed on each case page. Views, reposts and quotes are not exposed there.</li>
          <li>Hook tags are regular expressions over the visible caption until Phase 2 adds transcripts and model-based extraction.</li>
          <li>Nine launches is a pattern, not a law. Counts and medians only; no significance tests.</li>
        </ul>
        <p className="mt-4 text-[13px] leading-5 text-ink-2">Computed {generated}.</p>
      </section>
    </div>
  );
}
