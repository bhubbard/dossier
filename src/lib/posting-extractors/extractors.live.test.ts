import { describe, expect, it } from "vitest";

import { fetchPosting } from "@/lib/posting-fetch";

const describeLive = process.env.POSTINGS_LIVE ? describe : describe.skip;

describeLive("Live posting extraction", () => {
  it("fetches a live LinkedIn job posting directly without auth wall", async () => {
    // Public Affirm job ID
    const url = "https://www.linkedin.com/jobs/view/4479302277";
    const result = await fetchPosting(url);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.source).toBe("structured");
    expect(result.text).toContain("Affirm");
    expect(result.text).toContain("Software Engineer");
    expect(result.text.length).toBeGreaterThan(500);
  });

  it("fetches a live Greenhouse job posting directly", async () => {
    const url = "https://job-boards.greenhouse.io/gitlab/jobs/8638232002";
    const result = await fetchPosting(url);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(["structured", "page"]).toContain(result.source);
    expect(result.text.length).toBeGreaterThan(300);
  });
});
