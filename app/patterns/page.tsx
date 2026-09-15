import Link from "next/link";
import { analysis, launchesChronological } from "@/lib/data";
import { tagCaption } from "@/lib/analyze/captions";

export const metadata = { title: "Patterns — Launch Atlas" };

const HOOKS = ["funding", "traction", "product", "story", "stunt"] as const;

function Dot({ on }: { on: boolean }) {
  return on ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-ink" aria-label="yes" /> : <span className="inline-block w-2.5 h-2.5 rounded-full border border-rule" aria-label="no" />;
}

export default function Patterns() {
  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="display">Nine launches, side by side</h1>
      <p className="measure mt-4 text-[17px] leading-7 text-ink-2">
        One row per launch, one column per thing we can read off the public post. The pattern is in the columns, not the rows.
      </p>
      <div className="mt-10 overflow-x-auto">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Launch</th>
              <th>Day</th>
              <th className="n">Eastern</th>
              <th className="n">LinkedIn gap</th>
              <th>Media</th>
              <th>Account</th>
              {HOOKS.map((h) => <th key={h}>{h}</th>)}
              <th className="n">Replies per like</th>
            </tr>
          </thead>
          <tbody>
            {launchesChronological.map((l) => {
              const t = analysis.timing.find((r) => r.slug === l.slug)!;
              const e = analysis.engagement.find((r) => r.slug === l.slug)!;
              const tags = tagCaption(l.captionExcerpt);
              return (
                <tr key={l.slug}>
                  <td><Link href={`/launches/${l.slug}`} className="underline hover:text-ink-2">{l.client}</Link></td>
                  <td>{t.weekdayEt}</td>
                  <td className="n">{t.etClock}</td>
                  <td className="n">{t.linkedinMinusXMin == null ? <span className="text-ink-2">none</span> : `${t.linkedinMinusXMin > 0 ? "+" : ""}${t.linkedinMinusXMin}`}</td>
                  <td>{l.mediaType}</td>
                  <td>{l.authorType}</td>
                  {HOOKS.map((h) => <td key={h}><Dot on={tags[h]} /></td>)}
                  <td className="n">{e.replyRate == null ? "—" : `${Math.round(e.replyRate * 100)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[13px] leading-5 text-ink-2 measure">Hook columns are regex over the visible caption and will be replaced by transcript-based tagging in Phase 2. LinkedIn gap is minutes after the X post; negative means LinkedIn went first.</p>
    </div>
  );
}
