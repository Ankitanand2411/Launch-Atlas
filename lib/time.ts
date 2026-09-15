export const ZONES = {
  utc: "UTC",
  et: "America/New_York",
  pt: "America/Los_Angeles",
  ist: "Asia/Kolkata",
} as const;

export type ZoneKey = keyof typeof ZONES;

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  // Intl may yield "24" for midnight in some engines.
  const hour = out.hour === "24" ? "00" : out.hour;
  return { weekday: out.weekday, hour, minute: out.minute };
}

/** "HH:MM" in the given zone (24h). */
export function clock(date: Date, zone: ZoneKey): string {
  const p = parts(date, ZONES[zone]);
  return `${p.hour}:${p.minute}`;
}

/** Short weekday name in the given zone, e.g. "Mon". */
export function weekday(date: Date, zone: ZoneKey): string {
  return parts(date, ZONES[zone]).weekday;
}

/** Minutes after local midnight in the given zone. */
export function minutesOfDay(date: Date, zone: ZoneKey): number {
  const p = parts(date, ZONES[zone]);
  return Number(p.hour) * 60 + Number(p.minute);
}

export function diffMinutes(later: Date, earlier: Date): number {
  return Math.round(((later.getTime() - earlier.getTime()) / 60000) * 10) / 10;
}

export function isoNoMs(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
