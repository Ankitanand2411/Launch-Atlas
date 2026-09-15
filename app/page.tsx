import { LaunchClock } from "@/components/LaunchClock";
import { Roster } from "@/components/Roster";
import { analysis, launchesChronological } from "@/lib/data";

export default function Home() {
  const h2 = analysis.hypotheses.find((h) => h.code === "H2");
  const h3 = analysis.hypotheses.find((h) => h.code === "H3");
  const working = h2?.verdict === "supported" && h3?.verdict === "supported";
  return (
    <div className="pt-14 sm:pt-20">
      <h1 className="display measure">Nine launches. One clock.</h1>
      <p className="measure mt-5 text-[17px] leading-7 text-ink-2">
        Every launch Social Capital Inc. lists on its work page, decoded from the public posts themselves:
        when it fired, on which platforms, with what hook, and how the room responded.
      </p>
      {working && (
        <p className="measure mt-8 text-[20px] leading-8">
          <span className="marker">
            All nine hero posts fired Monday to Thursday between 8:00 and 13:30 Eastern, and every LinkedIn mirror went live within nine minutes of the X post.
          </span>
          <span className="block mt-2 text-[13px] leading-5 text-ink-2">Working finding from Phase 1. Verified against the decoded timestamps below; hooks and amplification still to come.</span>
        </p>
      )}
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
