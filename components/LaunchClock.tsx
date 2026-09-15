import type { TimingRow } from "@/lib/types";

/**
 * The hero figure: weekday rows against a US Eastern time-of-day axis.
 * X hero post = filled mark carrying the launch's chronological number (keyed to the roster);
 * LinkedIn mirror = ring drawn at its own minute. Marks that would overlap are spread into
 * symmetric lanes. Wednesday and Friday stay drawn while empty — that is the point.
 *
 * Two variants share the code: a 24-hour axis for wide screens and a 6am–6pm axis for phones.
 */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const hourLabel = (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

interface Geometry { W: number; LEFT: number; RIGHT: number; TOP: number; ROW: number; R: number; startHour: number; endHour: number; tickEvery: number; label: number; day: number }
const WIDE: Geometry = { W: 960, LEFT: 44, RIGHT: 16, TOP: 30, ROW: 50, R: 9, startHour: 0, endHour: 24, tickEvery: 3, label: 12, day: 13 };
const NARROW: Geometry = { W: 420, LEFT: 38, RIGHT: 10, TOP: 28, ROW: 52, R: 10.5, startHour: 6, endHour: 18, tickEvery: 2, label: 11.5, day: 12.5 };

/** Spread marks that would overlap into lanes: [0], [-1,1], [-1,0,1], … */
function lanes(xs: number[], minGap: number): number[] {
  const out = new Array<number>(xs.length).fill(0);
  let start = 0;
  for (let i = 1; i <= xs.length; i++) {
    if (i === xs.length || xs[i] - xs[i - 1] >= minGap) {
      const size = i - start;
      for (let k = 0; k < size; k++) out[start + k] = size === 1 ? 0 : k - (size - 1) / 2;
      start = i;
    }
  }
  return out;
}

function Clock({ rows, g, className }: { rows: TimingRow[]; g: Geometry; className: string }) {
  const span = (g.endHour - g.startHour) * 60;
  const x = (min: number) => g.LEFT + ((min - g.startHour * 60) / span) * (g.W - g.LEFT - g.RIGHT);
  const H = g.TOP + DAYS.length * g.ROW + 8;
  const ordered = [...rows].sort((a, b) => a.xPostedAtUtc.localeCompare(b.xPostedAtUtc));
  const number = new Map(ordered.map((r, i) => [r.slug, i + 1]));
  const hours: number[] = [];
  for (let h = g.startHour; h <= g.endHour; h += g.tickEvery) hours.push(h);

  return (
    <svg viewBox={`0 0 ${g.W} ${H}`} className={`w-full h-auto ${className}`} role="img" aria-label="Nine launches placed by weekday and US Eastern time of day. Numbers match the list below.">
      {hours.map((h) => (
        <g key={h}>
          <line x1={x(h * 60)} x2={x(h * 60)} y1={g.TOP - 4} y2={g.TOP + DAYS.length * g.ROW} stroke="var(--color-rule)" strokeWidth={1} />
          {h < g.endHour && <text x={x(h * 60)} y={g.TOP - 12} fontSize={g.label} fill="var(--color-ink-2)" textAnchor={h === g.startHour ? "start" : "middle"}>{hourLabel(h)}</text>}
        </g>
      ))}
      {DAYS.map((day, i) => {
        const y = g.TOP + i * g.ROW + g.ROW / 2;
        const items = rows.filter((r) => r.weekdayEt === day).sort((a, b) => a.etMinutes - b.etMinutes);
        const laneOf = lanes(items.map((r) => x(r.etMinutes)), 2 * g.R + 6);
        return (
          <g key={day}>
            <text x={0} y={y + 4} fontSize={g.day} fill={items.length ? "var(--color-ink)" : "var(--color-ink-2)"}>{day}</text>
            <line x1={g.LEFT} x2={g.W - g.RIGHT} y1={y} y2={y} stroke="var(--color-rule)" strokeWidth={1} />
            {items.map((r, j) => {
              const cx = x(r.etMinutes);
              const cy = y + laneOf[j] * (g.R + 4);
              const n = number.get(r.slug)!;
              const delay = `${(n - 1) * 0.05}s`;
              const li = r.linkedinMinusXMin;
              return (
                <g key={r.slug}>
                  <title>{`${n}. ${r.client}: ${r.weekdayEt} ${r.etClock} ET, ${r.utcClock} UTC${li != null ? `; LinkedIn ${li >= 0 ? "+" : ""}${li} min` : ""}`}</title>
                  {li != null && <circle className="mark" style={{ animationDelay: delay }} cx={x(r.etMinutes + li)} cy={cy} r={g.R + 4} fill="none" stroke="var(--color-mark-li)" strokeWidth={1.5} />}
                  <circle className="mark" style={{ animationDelay: delay }} cx={cx} cy={cy} r={g.R} fill="var(--color-mark-x)" />
                  <text x={cx} y={cy + g.R * 0.38} fontSize={g.R * 1.15} fontWeight={500} fill="var(--color-paper)" textAnchor="middle" pointerEvents="none">{n}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function LaunchClock({ rows }: { rows: TimingRow[] }) {
  return (
    <figure className="w-full">
      <Clock rows={rows} g={WIDE} className="hidden sm:block" />
      <Clock rows={rows} g={NARROW} className="sm:hidden" />
      <figcaption className="mt-3 text-[13px] leading-5 text-ink-2 flex flex-wrap gap-x-5 gap-y-1">
        <span className="inline-flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-mark-x" />X hero post, numbered in date order</span>
        <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full border-[1.5px] border-mark-li" />LinkedIn mirror, at its own minute</span>
        <span>Time of day in US Eastern, daylight-saving aware.<span className="sm:hidden"> Phone view shows 6am to 6pm; nothing falls outside it.</span></span>
      </figcaption>
    </figure>
  );
}
