"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractIds } from "@/lib/read";

/** The front door: paste links, go to the reading. */
export function ReadBox() {
  const [text, setText] = useState("");
  const router = useRouter();
  const ids = extractIds(text);
  function go() {
    if (ids.length) router.push(`/analyze?ids=${ids.join(",")}`);
  }
  return (
    <div className="max-w-[760px]">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Paste a launch post from X. Add the creators who quoted it, one link per line, to read the whole launch."}
        rows={3}
        className="w-full px-3 py-2 border border-ink bg-paper text-[15px] leading-6 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-label="Links to posts on X"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go(); }}
      />
      <div className="mt-3 flex items-center gap-3">
        <button onClick={go} disabled={!ids.length} className="h-11 px-5 bg-ink text-paper text-[15px] disabled:opacity-40">
          {ids.length > 1 ? `Read ${ids.length} posts as one launch` : "Read this launch"}
        </button>
        <span className="text-[13px] text-ink-2">Exact posting time from the link itself; counts from free public endpoints.</span>
      </div>
    </div>
  );
}
