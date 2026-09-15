import Link from "next/link";
import { analysis, launchesChronological } from "@/lib/data";
import { formatCompact } from "@/lib/metrics";

export const metadata = { title: "Network — Launch Atlas" };

export default function Network() {
  const rows = launchesChronological.map((l) => analysis.amplification.find((a) => a.slug === l.slug)!);
  const exact = rows.filter((r) => r.views != null || r.reposts != null);
  const roster = analysis.roster;
  const h7 = analysis.hypotheses.find((h) => h.code === "H7");
  return (
    <div className="pt-12 sm:pt-16">
      <h1 className="display">How the posts travelled</h1>
      <p className="measure mt-4 text-[17px] leading-7 text-ink-2">
        Amplification read from free public data only: exact counts on each hero post, and a hand-kept roster of who quoted it. No paid scrapers.
      </p>
      {h7 && <p className="measure mt-6 text-[15px] leading-6">{h7.summary}</p>}

      <section className="mt-12">
        <h2 className="section-title">Shape of the amplification</h2>
        {exact.length ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="grid-table">
                <thead>
                  <tr><th>Launch</th><th className="n">Views</th><th className="n">Likes</th><th className="n">Reposts</th><th className="n">Quotes</th><th className="n">Replies</th><th className="n">Quote share</th><th className="n">Likes per 1K views</th><th className="n">Followers</th><th className="n hidden md:table-cell">LinkedIn</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.slug}>
                      <td><Link href={`/launches/${r.slug}`} className="underline hover:text-ink-2">{r.client}</Link></td>
                      <td className="n">{formatCompact(r.views)}</td>
                      <td className="n">{formatCompact(r.likes)}</td>
                      <td className="n">{formatCompact(r.reposts)}</td>
                      <td className="n">{formatCompact(r.quotes)}</td>
                      <td className="n">{formatCompact(r.replies)}</td>
                      <td className="n">{r.quoteShare == null ? "—" : `${Math.round(r.quoteShare * 100)}%`}</td>
                      <td className="n">{r.likesPerThousandViews == null ? "—" : r.likesPerThousandViews}</td>
                      <td className="n">{formatCompact(r.authorFollowers)}</td>
                      <td className="n hidden md:table-cell">{r.linkedinReactions == null ? "—" : `${formatCompact(r.linkedinReactions)} / ${formatCompact(r.linkedinComments)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-ink-2 measure">Quote share is quotes ÷ (quotes + reposts): above 50% means the network talks about the post more than it forwards it. LinkedIn shows reactions / comments where the public page exposed them.</p>
          </>
        ) : (
          <div className="mt-4 measure text-[15px] leading-7">
            <p>Exact counts have not been fetched yet. The case-page embeds give rounded likes and replies; the rest needs one command, no key:</p>
            <pre className="mt-3 bg-surface px-3 py-2 text-[14px] overflow-x-auto">npm run amplify && npm run analyze</pre>
            <p className="mt-3 text-ink-2">It reads each hero post through a free public endpoint (views, reposts, quotes, replies, bookmarks, follower count, full text) and the public LinkedIn page where it renders counts. Every miss is recorded, never guessed.</p>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="section-title">Who amplified</h2>
        {roster ? (
          <div className="mt-4">
            <p className="text-[15px] leading-7 measure">{roster.creators} creators across {roster.entries} amplifying posts. {roster.repeat.length} appear in two or more launches; {roster.repeat.filter((r) => r.launches.length >= 3).length} in three or more.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="grid-table">
                <thead><tr><th>Creator</th><th>Platform</th><th className="n">Followers</th><th className="n">Launches</th><th>Which</th></tr></thead>
                <tbody>
                  {roster.repeat.map((r) => (
                    <tr key={`${r.platform}:${r.handle}`}><td>@{r.handle}</td><td>{r.platform}</td><td className="n">{formatCompact(r.followers)}</td><td className="n">{r.launches.length}</td><td>{r.launches.join(", ")}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-ink-2">By follower tier: {Object.entries(roster.byTier).map(([t, c]) => `${t} ${c}`).join(", ")}. Handles and follower counts only; nothing beyond what the platforms show publicly.</p>
          </div>
        ) : (
          <div className="mt-4 measure text-[15px] leading-7">
            <p>The repeat-creator question has no free API. The honest free path is manual: open each hero post's Quotes tab while logged in, and add one row per creator post to <code className="bg-surface px-1">data/manual/amplifiers.csv</code>:</p>
            <pre className="mt-3 bg-surface px-3 py-2 text-[14px] overflow-x-auto">launch_slug,platform,handle,followers,kind,url,posted_at_utc{"\n"}gamma,x,somecreator,45000,quote,https://x.com/somecreator/status/…,2025-11-10T15:12:00Z</pre>
            <p className="mt-3 text-ink-2">Re-run <code className="bg-surface px-1">npm run analyze</code> and this page fills in: overlap across launches, follower tiers, and the minutes-after-founder wave. Fifty rows per launch is enough to see a core.</p>
          </div>
        )}
      </section>
    </div>
  );
}
