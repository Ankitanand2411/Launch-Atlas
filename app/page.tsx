import { LaunchClock } from "@/components/LaunchClock";
import { Roster } from "@/components/Roster";
import { analysis, launches, launchesChronological } from "@/lib/data";
import { buildInsight } from "@/lib/insight";
import Link from "next/link";

export default function Home() {
  const ins = buildInsight(analysis, launches);
  return (
    <div className="pt-14 sm:pt-20">
      <h1 className="display measure">Nine launches. One clock.</h1>
      <p className="measure mt-5 text-[17px] leading-7 text-ink-2">
        Every launch Social Capital Inc. lists on its work page, decoded from the public posts themselves:
        when it fired, on which platforms, with what hook, and how the room responded.
      </p>
      <p className="measure mt-8 text-[20px] leading-8">
        <span className="marker">{ins.headline}</span>
        <span className="block mt-2 text-[13px] leading-5 text-ink-2">
          {ins.status === "headline" ? "Verified against the decoded timestamps below." : "Working finding; see the hypothesis board."} <Link href="/insight" className="underline hover:text-ink">Read the full insight</Link>
        </span>
      </p>
      <section className="mt-14">
        <LaunchClock rows={analysis.timing} />
      </section>
      <section className="mt-14">
        <h2 className="section-title">The nine, in order</h2>
        <p className="mt-2 mb-6 text-[15px] leading-6 text-ink-2 measure">Times are decoded from each post's ID. Likes and replies are the rounded counts shown in the embed on Social Capital's own case page.</p>
        <Roster launches={launchesChronological} timing={analysis.timing} engagement={analysis.engagement} />
      </section>
    </div>
  );
}
