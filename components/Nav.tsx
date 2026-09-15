import Link from "next/link";

const links = [
  { href: "/", label: "Launches" },
  { href: "/patterns", label: "Patterns" },
  { href: "/insight", label: "Insight" },
];

export function Nav() {
  return (
    <header className="w-full border-b border-rule">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-medium tracking-[-0.01em]">Launch Atlas</Link>
        <nav className="flex gap-6 text-[15px]">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-2 hover:text-ink">{l.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
