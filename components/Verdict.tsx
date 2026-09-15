import type { Verdict as V } from "@/lib/types";

const styles: Record<V, string> = {
  supported: "bg-highlight text-ink",
  mixed: "bg-surface text-ink",
  rejected: "border border-ink text-ink",
  untested: "border border-rule text-ink-2",
};

export function Verdict({ value }: { value: V }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] leading-5 ${styles[value]}`}>{value}</span>;
}
