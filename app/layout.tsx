import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { REPO_URL } from "@/lib/data";

export const metadata: Metadata = {
  title: "Launch Atlas",
  description: "Every launch Social Capital Inc. lists publicly, decoded from the posts themselves.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-[1120px] mx-auto px-5 sm:px-8 pb-24">{children}</main>
        <footer className="w-full max-w-[1120px] mx-auto px-5 sm:px-8 py-8 border-t border-rule text-[13px] leading-5 text-ink-2 flex flex-wrap gap-x-6 gap-y-2">
          <span>Public data only. Every number links to its source.</span>
          <span>Timestamps decoded from post IDs; counts are platform-rounded.</span>
          {REPO_URL && <a className="underline hover:text-ink" href={REPO_URL}>Source and build log</a>}
        </footer>
      </body>
    </html>
  );
}
