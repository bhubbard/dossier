import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "@/lib/ai/test-http";

import { linkedin, parseLinkedInPostings } from "./linkedin";
import { EMPTY_QUERY } from "./search";

const sampleSearchHtml = `
<!DOCTYPE html>
<ul>
  <li>
    <div class="base-search-card" data-entity-urn="urn:li:jobPosting:4479302277">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/software-engineer-4479302277?trk=public_jobs">
        <span class="sr-only">Software Engineer</span>
      </a>
      <h3 class="base-search-card__title">Software Engineer</h3>
      <h4 class="base-search-card__subtitle">Affirm</h4>
      <span class="job-search-card__location">San Francisco, CA</span>
      <time datetime="2026-11-01">3 days ago</time>
    </div>
  </li>
  <li>
    <div class="base-search-card" data-entity-urn="urn:li:jobPosting:4479302278">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/frontend-engineer-4479302278">
        <span class="sr-only">Frontend Engineer</span>
      </a>
      <h3 class="base-search-card__title">Frontend Engineer</h3>
      <h4 class="base-search-card__subtitle">Acme Corp</h4>
      <span class="job-search-card__location">Remote</span>
      <time datetime="2026-11-02">2 days ago</time>
    </div>
  </li>
</ul>
`;

const sampleDetailHtml = `
<!DOCTYPE html>
<html>
<body>
  <div class="topcard__flavor-row">
    <a class="topcard__flavor--black-link" href="#">Affirm</a>
    <span class="topcard__flavor">San Francisco, CA</span>
  </div>
  <h2 class="topcard__title">Software Engineer</h2>
  <ul class="description__job-criteria-list">
    <li class="description__job-criteria-item">
      <h3>Seniority level</h3>
      <span>Mid-Senior level</span>
    </li>
    <li class="description__job-criteria-item">
      <h3>Employment type</h3>
      <span>Full-time</span>
    </li>
  </ul>
  <div class="show-more-less-html__markup">
    <p>We are looking for a Software Engineer to join our team.</p>
  </div>
</body>
</html>
`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LinkedIn job search adapter", () => {
  it("builds correct search query parameters", async () => {
    const requests = stubFetch(() => new Response(sampleSearchHtml, { status: 200 }));
    const query = {
      ...EMPTY_QUERY,
      keywords: "React Engineer",
      place: "New York",
      country: "us",
      radiusKm: 50 as const,
      remoteOnly: true,
      postedWithin: "week" as const,
      experience: "senior" as const,
    };

    await linkedin.search(query, {}, null);

    expect(requests).toHaveLength(1);
    const url = requests[0].url;
    expect(url.pathname).toBe("/jobs-guest/jobs/api/seeMoreJobPostings/search");
    expect(url.searchParams.get("keywords")).toBe("React Engineer");
    expect(url.searchParams.get("location")).toBe("New York, us");
    expect(url.searchParams.get("f_WT")).toBe("2");
    expect(url.searchParams.get("f_TPR")).toBe("r604800");
    expect(url.searchParams.get("f_E")).toBe("4");
    expect(url.searchParams.get("start")).toBe("0");
  });

  it("parses search result HTML into FoundPostings", () => {
    const postings = parseLinkedInPostings(sampleSearchHtml);
    expect(postings).toHaveLength(2);
    expect(postings[0]).toEqual({
      source: "LINKEDIN",
      externalId: "4479302277",
      title: "Software Engineer",
      company: "Affirm",
      place: "San Francisco, CA",
      remote: null,
      salary: "",
      postedAt: "2026-11-01T00:00:00.000Z",
      url: "https://www.linkedin.com/jobs/view/software-engineer-4479302277",
      via: "LinkedIn",
      description: "",
      complete: false,
    });
    expect(postings[1].remote).toBe(true);
  });

  it("fetches and parses job details", async () => {
    stubFetch(() => new Response(sampleDetailHtml, { status: 200 }));
    const text = await linkedin.details(
      {
        source: "LINKEDIN",
        externalId: "4479302277",
        title: "Software Engineer",
        company: "Affirm",
        place: "San Francisco, CA",
        remote: null,
        salary: "",
        postedAt: null,
        url: "https://www.linkedin.com/jobs/view/4479302277",
        via: "LinkedIn",
        description: "",
        complete: false,
      },
      {},
    );

    expect(text).toContain("Affirm: Software Engineer");
    expect(text).toContain("San Francisco, CA");
    expect(text).toContain("Seniority level: Mid-Senior level");
    expect(text).toContain("Employment type: Full-time");
    expect(text).toContain("We are looking for a Software Engineer to join our team.");
  });

  it("passes connection test", async () => {
    const requests = stubFetch(() => new Response("<div>ok</div>", { status: 200 }));
    await linkedin.test({});
    expect(requests[0].url.pathname).toBe("/jobs-guest/jobs/api/seeMoreJobPostings/search");
  });
});
