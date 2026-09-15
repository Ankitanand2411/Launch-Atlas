import type { PostReading } from "@/lib/read";

/** Amplifying posts placed by minutes after the founder's post (square-root scale), sized by followers. */
export function WaveStrip({ amplifiers }: { amplifiers: PostReading[] }) {
  const W = 960, H = 150, LEFT = 24, RIGHT = 24, BASE = 84;
  const maxMin = Math.max(60, ...amplifiers.map((a) => a.minutesAfterHero));
  const x = (min: number) => LEFT + Math.sqrt(Math.max(0, min) / maxMin) * (W - LEFT - RIGHT);
  const r = (f: number | null) => Math.min(16, 4 + Math.sqrt(f ?? 0) / 60);
  // Drop ticks whose labels would collide on the square-root axis.
  const ticks = [0, 10, 60, 360, 1440, 4320, 10080, 43200].filter((t) => t <= maxMin).reduce<number[]>((acc, t) => (acc.length === 0 || x(t) - x(acc[acc.length - 1]) >= 56 ? [...acc, t] : acc), []);
  const label = (t: number) => (t === 0 ? "founder post" : t < 60 ? `${t}m` : t < 1440 ? `${t / 60}h` : `${Math.round(t / 1440)}d`);
  const lanes = new Map<string, number>();
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Amplifying posts by minutes after the founder's post">
        <line x1={LEFT} x2={W - RIGHT} y1={BASE} y2={BASE} stroke="var(--color-rule)" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={BASE - 6} y2={BASE + 6} stroke="var(--color-ink-2)" />
            <text x={x(t)} y={BASE + 24} fontSize={12} textAnchor={t === 0 ? "start" : "middle"} fill="var(--color-ink-2)">{label(t)}</text>
          </g>
        ))}
        <line x1={x(0)} x2={x(0)} y1={16} y2={BASE} stroke="var(--color-ink)" strokeWidth={1.5} />
        {amplifiers.map((a) => {
          const cx = x(a.minutesAfterHero);
          const key = String(Math.round(cx / 14));
          const lane = lanes.get(key) ?? 0; lanes.set(key, lane + 1);
          const cy = BASE - 14 - r(a.metrics?.authorFollowers ?? null) - lane * 12;
          const rad = r(a.metrics?.authorFollowers ?? null);
          return (
            <g key={a.id}>
              <title>{`@${a.handle ?? "unknown"} · ${a.kind} · ${a.minutesAfterHero} min after · ${a.metrics?.authorFollowers ?? "?"} followers`}</title>
              {a.kind === "quote" && <circle cx={cx} cy={cy} r={rad} fill="var(--color-ink)" />}
              {a.kind === "reply" && <circle cx={cx} cy={cy} r={rad} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={1.5} />}
              {a.kind === "standalone" && <circle cx={cx} cy={cy} r={rad} fill="var(--color-surface)" stroke="var(--color-ink-2)" strokeWidth={1} />}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[13px] leading-5 text-ink-2 flex flex-wrap gap-x-5 gap-y-1">
        <span className="inline-flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-ink" />quote post</span>
        <span className="inline-flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-ink" />reply</span>
        <span className="inline-flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-surface border border-ink-2" />standalone post</span>
        <span>Size is follower count. Time axis is square-root, so minutes and days both fit.</span>
      </figcaption>
    </figure>
  );
}
