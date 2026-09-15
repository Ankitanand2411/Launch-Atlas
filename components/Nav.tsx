import Link from "next/link";

const links = [
  { href: "/", label: "Launches" },
  { href: "/patterns", label: "Patterns" },
  { href: "/network", label: "Network" },
  { href: "/claims", label: "Claims" },
  { href: "/analyze", label: "Read a launch" },
  { href: "/insight", label: "Insight" },
];

export function Nav() {
  return (
    <header className="w-full border-b border-rule">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 min-h-14 py-3 flex flex-wrap items-center justify-between gap-y-2">
        <Link href="/" className="font-medium tracking-[-0.01em]">Launch Atlas</Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-2 hover:text-ink">{l.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
