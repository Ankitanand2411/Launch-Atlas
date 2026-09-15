import { analysis } from "@/lib/data";
import { Verdict } from "@/components/Verdict";

export const metadata = { title: "Claims — Launch Atlas" };

export default function Claims() {
  const dated = analysis.claims.filter((c) => c.date);
  const undated = analysis.claims.filter((c) => !c.date);
  const h8 = analysis.hypotheses.find((h) => h.code === "H8");
  const Row = ({ c }: { c: (typeof analysis.claims)[number] }) => (
    <li className="py-5 grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
      <span className="num text-[15px] text-ink-2">{c.date ?? "undated"}</span>
      <div className="measure">
        {c.tagline && <p className="text-[17px] leading-7">{c.tagline}</p>}
        <p className="mt-1 text-[15px] leading-6">
          {[c.viewsClaim, c.creatorsClaim, c.teamSize, c.growthClaim].filter(Boolean).join(" · ") || <span className="text-ink-2">no figures</span>}
          {c.guarantee ? <span className="ml-2 rounded-full bg-highlight px-2 py-0.5 text-[13px]">guarantee</span> : null}
        </p>
        <p className="mt-1 text-[13px] leading-5 text-ink-2">{c.note} <a className="underline hover:text-ink" href={c.url}>{c.source}</a></p>
      </div>
    </li>
  );
  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="display">What they say about themselves</h1>
      <p className="measure mt-4 text-[17px] leading-7 text-ink-2">
        The public description of Social Capital, as captured over time. Reach and roster figures, team size, growth and whether a viral launch is guaranteed.
      </p>
      {h8 && <p className="measure mt-6 text-[15px] leading-6 flex flex-wrap items-start gap-3"><Verdict value={h8.verdict} /><span className="flex-1">{h8.summary}</span></p>}
      <section className="mt-10">
        <h2 className="section-title">Dated captures</h2>
        {dated.length ? <ol className="mt-2 divide-y divide-rule border-b border-ink">{dated.map((c, i) => <Row key={i} c={c} />)}</ol> : <p className="mt-3 text-[15px] text-ink-2">None yet. <code className="bg-surface px-1">npm run claims</code> pulls Wayback Machine captures.</p>}
      </section>
      <section className="mt-12">
        <h2 className="section-title">Undated observations, inferred order</h2>
        <p className="mt-2 text-[13px] leading-5 text-ink-2 measure">Third-party profiles quote earlier versions of the company description without a capture date. Ordered by the stated number; Wayback captures will date them.</p>
        <ol className="mt-2 divide-y divide-rule border-b border-ink">{undated.map((c, i) => <Row key={i} c={c} />)}</ol>
      </section>
    </div>
  );
}
