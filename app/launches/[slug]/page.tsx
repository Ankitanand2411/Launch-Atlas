import Link from "next/link";
import { notFound } from "next/navigation";
import { launches, getLaunch, getPosts, getTiming, getEngagement, getEnrichment, enrichment, monthLabel, dateLabel } from "@/lib/data";
import { formatCompact } from "@/lib/metrics";
import { getTags } from "@/lib/analyze/hooks";
import { formatDuration } from "@/lib/enrich/ffprobe";

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
  const en = getEnrichment(slug);
  const tags = getTags(l, enrichment);
  const caption = en?.fullText ?? l.captionExcerpt;
  const captionTruncated = en?.fullText ? false : l.captionTruncated;

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
          <blockquote className="mt-4 whitespace-pre-wrap text-[17px] leading-7 measure">{caption}{captionTruncated ? " …" : ""}</blockquote>
          <p className="mt-3 text-[13px] leading-5 text-ink-2">
            {captionTruncated ? "Excerpt as shown in the embed; " : ""}<a className="underline hover:text-ink" href={l.xUrl}>read the full post on X</a>
            {l.videoUrl && <> or <a className="underline hover:text-ink" href={l.videoUrl}>open the video file</a></>}.
          </p>
          <div className="mt-8">
            <h3 className="text-[15px] font-medium">Hooks</h3>
            <p className="text-[13px] leading-5 text-ink-2 mb-2">
              {tags.source === "model" ? `Tagged by ${tags.model} over the caption${en?.transcript ? " and transcript" : ""}; confidence ${Math.round(tags.confidence * 100)}%.` : "Regex over the visible caption, provisional until enrichment runs."}
            </p>
            <ul className="flex flex-wrap gap-2">
              {tags.hooks.map((h) => (
                <li key={h} className={`rounded-full px-2.5 py-0.5 text-[13px] ${h === tags.primaryHook ? "bg-ink text-paper" : "bg-surface"}`}>{h}{h === tags.primaryHook ? ", leads" : ""}</li>
              ))}
            </ul>
            <dl className="mt-4 text-[15px] leading-6 measure">
              <div><dt className="inline text-ink-2">First line: </dt><dd className="inline">{tags.firstLine}</dd></div>
              <div><dt className="inline text-ink-2">Figure in the first three lines: </dt><dd className="inline">{tags.figureInFirstThreeLines ? "yes" : "no"}</dd></div>
              {tags.capitalFigures.length > 0 && <div><dt className="inline text-ink-2">Figures quoted: </dt><dd className="inline">{tags.capitalFigures.join("; ")}</dd></div>}
              {tags.cta && <div><dt className="inline text-ink-2">Call to action: </dt><dd className="inline">{tags.cta}</dd></div>}
            </dl>
          </div>

          {en?.transcript && (
            <details className="mt-8 group">
              <summary className="cursor-pointer text-[15px] font-medium">Transcript <span className="text-ink-2 font-normal">({en.transcript.text.split(/\s+/).length} words, {en.transcript.model})</span></summary>
              <ol className="mt-3 measure text-[15px] leading-7">
                {en.transcript.segments.map((seg, i) => (
                  <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2"><span className="num text-ink-2">{formatDuration(seg.start)}</span><span>{seg.text}</span></li>
                ))}
              </ol>
            </details>
          )}
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
            <Fact label="Type">{l.mediaType}{l.videoUrl ? <span className="text-ink-2"> — native upload</span> : null}</Fact>
            {en?.video && (
              <div className="grid grid-cols-3">
                <Fact label="Length">{formatDuration(en.video.durationS)}</Fact>
                <Fact label="Frame">{en.video.width}×{en.video.height}, {en.video.aspect}</Fact>
                <Fact label="Audio">{en.video.hasAudio ? "yes" : "none"}</Fact>
              </div>
            )}
            {en?.video && <p className="mt-2 text-[13px] leading-5 text-ink-2">Probed from the rendition the case page exposes; the source upload may be larger.</p>}
            {en && en.frames.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-2">
                {en.frames.map((f) => (
                  <li key={f}>
                    <img src={f} alt={`Frame at ${f.match(/-([\d.]+)\.jpg$/)?.[1] ?? ""} s`} className="w-full h-auto border border-rule" loading="lazy" />
                    <span className="block mt-1 text-[13px] text-ink-2 num">{f.match(/-([\d.]+)\.jpg$/)?.[1]} s</span>
                  </li>
                ))}
              </ul>
            )}
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
