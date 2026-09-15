import { describe, expect, it } from "vitest";
import { parseCasePage, parseWorkIndex, monthToIso } from "../scripts/lib/parse-case-page";

// Synthetic fixture modelled on the observed structure of sociallcapital.com/work/gamma
const CASE_HTML = `
<html><body>
<a href="https://www.sociallcapital.com/work">Back to work</a>
<p>Nov 2025</p>
<h1>Gamma</h1>
<a href="https://www.linkedin.com/posts/grantslee_today-as-shared-activity-7393646492839763968-Bws-">LinkedIn Today, as shared… Grant Lee</a>
<div class="tweet">
  <a href="https://x.com/thisisgrantlee/status/1987880600661889356">Grant Lee Gamma</a>
  <a href="https://x.com/thisisgrantlee/status/1987880600661889356">@thisisgrantlee</a>
  <a href="https://x.com/intent/follow?screen_name=thisisgrantlee">Follow</a>
  <a href="https://x.com/thisisgrantlee/status/1987880600661889356">https://x.com/thisisgrantlee/status/1987880600661889356</a>
  <p>Today, as shared by The New York Times, we’re announcing two things: Our Series B at a $2.1B valuation. <a href="https://x.com/thisisgrantlee/status/1987880600661889356">Show more</a></p>
  <video src="https://video.twimg.com/amplify_video/1987871318721679360/vid/avc1/1280x720/iQx_SYC06yJsdnXH.mp4"></video>
  <a href="https://x.com/thisisgrantlee/status/1987880600661889356">Watch on X</a>
  <a href="https://x.com/thisisgrantlee/status/1987880600661889356">1:50 PM · Nov 10, 2025</a>
  <a href="https://x.com/intent/like?tweet_id=1987880600661889356">2.8K</a>
  <a href="https://x.com/intent/tweet?in_reply_to=1987880600661889356">Reply</a>
  <a href="https://x.com/thisisgrantlee/status/1987880600661889356">Read 405 replies</a>
</div>
</body></html>`;

const INDEX_HTML = `
<ul>
<li><a href="https://www.sociallcapital.com/work/playerzero">PlayerZero<span>Mar 2026</span></a></li>
<li><a href="https://www.sociallcapital.com/work/wispr-flow">Wispr Flow<span>Feb 2026</span></a></li>
</ul>`;

describe("case page parser", () => {
  const p = parseCasePage(CASE_HTML);
  it("finds the hero X post and author", () => {
    expect(p.xUrl).toBe("https://x.com/thisisgrantlee/status/1987880600661889356");
    expect(p.authorHandle).toBe("thisisgrantlee");
  });
  it("finds the LinkedIn mirror, video, counts and time", () => {
    expect(p.linkedinUrl).toContain("activity-7393646492839763968");
    expect(p.videoUrl).toContain("iQx_SYC06yJsdnXH.mp4");
    expect(p.mediaType).toBe("video");
    expect(p.likesCompact).toBe("2.8K");
    expect(p.repliesCompact).toBe("405");
    expect(p.embedTimeText).toBe("1:50 PM · Nov 10, 2025");
    expect(p.client).toBe("Gamma");
    expect(p.month).toBe("2025-11");
  });
  it("extracts the visible caption and truncation flag", () => {
    expect(p.captionExcerpt).toContain("announcing two things");
    expect(p.captionTruncated).toBe(true);
  });
});

describe("work index parser", () => {
  it("returns slugs with client and month", () => {
    expect(parseWorkIndex(INDEX_HTML)).toEqual([
      { slug: "playerzero", client: "PlayerZero", month: "2026-03" },
      { slug: "wispr-flow", client: "Wispr Flow", month: "2026-02" },
    ]);
    expect(monthToIso("Feb 2025")).toBe("2025-02");
  });
});
