import Link from "next/link";
import { notFound } from "next/navigation";
import { launches, getLaunch, getPosts, getTiming, getEngagement, monthLabel, dateLabel } from "@/lib/data";
import { formatCompact } from "@/lib/metrics";
import { tagCaption } from "@/lib/analyze/captions";

export function generateStaticParams() {
  return launches.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = getLaunch(slug);
  return { title: l ? `${l.client} — Launch Atlas` : "Launch Atlas" };
}

function Fact({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`py-3 border-b border-rule ${className}`}>
      <div className="text-[13px] leading-5 text-ink-2">{label}</div>
      <div className="text-[15px] leading-6 num">{children}</div>
    </div>
  );
}

export default async function LaunchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = getLaunch(slug);
  if (!l) notFound();
  const t = getTiming(slug)!;
  const e = getEngagement(slug)!;
  const [x, li] = [getPosts(slug).find((p) => p.platform === "x")!, getPosts(slug).find((p) => p.platform === "linkedin") ?? null];
  const tags = tagCaption(l.captionExcerpt);
  const hooks = (["funding", "traction", "product", "story", "stunt"] as const).filter((k) => tags[k]);

  return (
    <div className="pt-12 sm:pt-16">
      <Link href="/" className="text-[15px] text-ink-2 hover:text-ink underline">All launches</Link>
      <h1 className="display mt-4">{l.client}</h1>
      <p className="mt-2 text-[17px] leading-7 text-ink-2">
        {monthLabel(l.month)}. Posted by {l.authorType === "brand" ? <>the brand account @{l.authorHandle}</> : <>{l.founderName} (@{l.authorHandle}), the founder</>}.
      </p>

      <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section>
          <h2 className="section-title">The hero post</h2>
          <blockquote className="mt-4 whitespace-pre-wrap text-[17px] leading-7 measure">{l.captionExcerpt}{l.captionTruncated ? " …" : ""}</blockquote>
          <p className="mt-3 text-[13px] leading-5 text-ink-2">
            {l.captionTruncated ? "Excerpt as shown in the embed; " : ""}<a className="underline hover:text-ink" href={l.xUrl}>read the full post on X</a>
            {l.videoUrl && <> or <a className="underline hover:text-ink" href={l.videoUrl}>open the video file</a></>}.
          </p>
          <div className="mt-8">
            <h3 className="text-[15px] font-medium">Hooks in the caption</h3>
            <p className="text-[13px] leading-5 text-ink-2 mb-2">Provisional, regex over the visible caption. Phase 2 tags the transcript with a model.</p>
            <ul className="flex flex-wrap gap-2">
              {hooks.length ? hooks.map((h) => <li key={h} className="rounded-full bg-surface px-2.5 py-0.5 text-[13px]">{h}</li>) : <li className="text-ink-2 text-[13px]">none detected</li>}
            </ul>
            <p className="mt-3 text-[15px] leading-6 measure"><span className="text-ink-2">First line:</span> {tags.firstLine}</p>
          </div>
        </section>

        <section>
          <h2 className="section-title">When it fired</h2>
          <div className="mt-2">
            <Fact label="X hero post">{dateLabel(t.xPostedAtUtc)}, {t.weekdayEt}</Fact>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <Fact label="Eastern">{t.etClock}</Fact>
              <Fact label="Pacific">{t.ptClock}</Fact>
              <Fact label="UTC">{t.utcClock}</Fact>
              <Fact label="India">{t.istClock}</Fact>
            </div>
            <Fact label="LinkedIn mirror">
              {li ? <>{li.postedAtUtc.slice(11, 16)} UTC, {t.linkedinMinusXMin! >= 0 ? `${t.linkedinMinusXMin} min after` : `${Math.abs(t.linkedinMinusXMin!)} min before`} the X post. <a className="underline hover:text-ink-2" href={li.url}>Open on LinkedIn</a></> : <span className="text-ink-2">Not linked from the case page.</span>}
            </Fact>
          </div>

          <h2 className="section-title mt-10">How the room responded</h2>
          <div className="mt-2 grid grid-cols-3">
            <Fact label="Likes">{formatCompact(e.likes)}{x.likesApprox ? <span className="text-ink-2"> ≈</span> : null}</Fact>
            <Fact label="Replies">{formatCompact(e.replies)}{x.repliesApprox ? <span className="text-ink-2"> ≈</span> : null}</Fact>
            <Fact label="Replies per like">{e.replyRate == null ? "—" : `${Math.round(e.replyRate * 100)}%`}</Fact>
          </div>
          <p className="mt-2 text-[13px] leading-5 text-ink-2">≈ marks a platform-rounded count taken from the embed snapshot. Views, reposts and quotes need the post page or an override.</p>

          <h2 className="section-title mt-10">Media</h2>
          <div className="mt-2">
            <Fact label="Type">{l.mediaType}{l.videoUrl ? <span className="text-ink-2"> — native upload, {l.videoUrl.includes("ext_tw_video") ? "older ext_tw_video path" : "amplify_video path"}</span> : null}</Fact>
          </div>

          <h2 className="section-title mt-10">Sources</h2>
          <ul className="mt-2 text-[15px] leading-7">
            <li><a className="underline hover:text-ink-2" href={l.sourceUrl}>Case page on sociallcapital.com</a></li>
            <li><a className="underline hover:text-ink-2" href={l.xUrl}>Hero post on X</a></li>
            {li && <li><a className="underline hover:text-ink-2" href={li.url}>Mirror on LinkedIn</a></li>}
          </ul>
          {l.notes && <p className="mt-6 text-[15px] leading-6 text-ink-2 measure">{l.notes}</p>}
        </section>
      </div>
    </div>
  );
}
