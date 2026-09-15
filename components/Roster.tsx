import Link from "next/link";
import type { EngagementRow, LaunchSeed, TimingRow } from "@/lib/types";
import { formatCompact } from "@/lib/metrics";
import { dateLabel } from "@/lib/data";

export function Roster({ launches, timing, engagement }: { launches: LaunchSeed[]; timing: TimingRow[]; engagement: EngagementRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="grid-table">
        <thead>
          <tr>
            <th className="n">#</th>
            <th>Launch</th>
            <th className="hidden sm:table-cell">Posted</th>
            <th>Day</th>
            <th className="n">Eastern</th>
            <th className="n hidden md:table-cell">UTC</th>
            <th className="n hidden lg:table-cell">India</th>
            <th className="n">LinkedIn gap</th>
            <th className="n hidden sm:table-cell">Likes</th>
            <th className="n hidden sm:table-cell">Replies</th>
            <th className="n hidden sm:table-cell">Replies per like</th>
            <th className="hidden md:table-cell">Media</th>
            <th className="hidden md:table-cell">Account</th>
          </tr>
        </thead>
        <tbody>
          {launches.map((l, i) => {
            const t = timing.find((r) => r.slug === l.slug)!;
            const e = engagement.find((r) => r.slug === l.slug)!;
            return (
              <tr key={l.slug}>
                <td className="n text-ink-2">{i + 1}</td>
                <td><Link href={`/launches/${l.slug}`} className="underline hover:text-ink-2">{l.client}</Link></td>
                <td className="num whitespace-nowrap hidden sm:table-cell">{dateLabel(t.xPostedAtUtc)}</td>
                <td>{t.weekdayEt}</td>
                <td className="n">{t.etClock}</td>
                <td className="n hidden md:table-cell">{t.utcClock}</td>
                <td className="n hidden lg:table-cell">{t.istClock}</td>
                <td className="n whitespace-nowrap">{t.linkedinMinusXMin == null ? <span className="text-ink-2">none</span> : `${t.linkedinMinusXMin > 0 ? "+" : ""}${t.linkedinMinusXMin} min`}</td>
                <td className="n hidden sm:table-cell">{formatCompact(e.likes)}</td>
                <td className="n hidden sm:table-cell">{formatCompact(e.replies)}</td>
                <td className="n hidden sm:table-cell">{e.replyRate == null ? "—" : `${Math.round(e.replyRate * 100)}%`}</td>
                <td className="hidden md:table-cell">{l.mediaType}</td>
                <td className="hidden md:table-cell">{l.authorType === "brand" ? "brand" : `founder`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
