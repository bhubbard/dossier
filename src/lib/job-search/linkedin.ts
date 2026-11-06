import "server-only";

import { parse } from "node-html-parser";

import type { JobSourceAdapter, RequestContext } from "./adapter";
import { requestHtml } from "./http";
import { safeLink, type FoundPosting, type SearchPage, type SearchQuery } from "./search";

// LinkedIn: direct job search and posting details via LinkedIn's public guest
// endpoints (/jobs-guest/jobs/api/seeMoreJobPostings/search and
// /jobs-guest/jobs/api/jobPosting/<id>). No API key, session cookie or
// account required.

const LINKEDIN_BASE = "https://www.linkedin.com";

const POSTED_TIME_FILTERS: Record<SearchQuery["postedWithin"], string | null> = {
  any: null,
  day: "r86400",
  "3days": "r259200",
  week: "r604800",
  month: "r2592000",
};

const EXPERIENCE_FILTERS: Record<NonNullable<SearchQuery["experience"]>, string | null> = {
  any: null,
  intern: "1",
  junior: "2",
  mid: "3,4",
  senior: "4",
  lead: "5,6",
};

export function parseLinkedInPostings(html: string): FoundPosting[] {
  const root = parse(html);
  const cards = root.querySelectorAll(".base-search-card, .job-search-card");
  const postings: FoundPosting[] = [];

  for (const card of cards) {
    const urn = card.getAttribute("data-entity-urn") ?? "";
    const urnMatch = /urn:li:jobPosting:(\d+)/.exec(urn);
    const linkEl = card.querySelector("a.base-card__full-link, a.base-search-card--link");
    const rawUrl = linkEl?.getAttribute("href") ?? "";
    const urlMatch = /jobs\/view\/(?:[a-zA-Z0-9-]+-)?(\d+)/.exec(rawUrl);
    const externalId = urnMatch?.[1] ?? urlMatch?.[1];
    if (!externalId) continue;

    const titleEl = card.querySelector(".base-search-card__title, h3");
    const companyEl = card.querySelector(".base-search-card__subtitle, h4");
    const locationEl = card.querySelector(".job-search-card__location");
    const timeEl = card.querySelector("time");

    const title = (titleEl?.text ?? "").trim().slice(0, 500);
    const company = (companyEl?.text ?? "").trim().slice(0, 300);
    const place = (locationEl?.text ?? "").trim().slice(0, 300);
    const datetime = timeEl?.getAttribute("datetime");
    const postedAt = datetime && !Number.isNaN(Date.parse(datetime)) ? new Date(datetime).toISOString() : null;

    const cleanUrl = rawUrl.split("?")[0] || `${LINKEDIN_BASE}/jobs/view/${externalId}`;
    const remote = /remote/i.test(place) ? true : null;

    postings.push({
      source: "LINKEDIN",
      externalId,
      title: title || "Untitled Position",
      company,
      place,
      remote,
      salary: "",
      postedAt,
      url: safeLink(cleanUrl).slice(0, 2000),
      via: "LinkedIn",
      description: "",
      complete: false,
    });
  }

  return postings;
}

export function parseLinkedInDetails(html: string, fallbackPosting?: FoundPosting): string | null {
  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false, pre: true } });

  const title = (root.querySelector(".top-card-layout__title, .topcard__title, h2.topcard__title")?.text ?? fallbackPosting?.title ?? "").trim();
  const company = (
    root.querySelector(".topcard__flavor--black-link, a[data-tracking-control-name='public_jobs_topcard-org-name'], .topcard__org-name-link")?.text ??
    fallbackPosting?.company ??
    ""
  ).trim();

  const locationEl = root.querySelector(".topcard__flavor-row .topcard__flavor:not(.topcard__flavor--bullet)");
  const place = (locationEl?.text ?? fallbackPosting?.place ?? "").trim();

  const criteriaItems = root.querySelectorAll(".description__job-criteria-item");
  const facts: string[] = [];
  if (place) facts.push(place);

  for (const item of criteriaItems) {
    const label = (item.querySelector("h3")?.text ?? "").trim();
    const value = (item.querySelector("span")?.text ?? "").trim();
    if (value && label) facts.push(`${label}: ${value}`);
  }

  const descEl = root.querySelector(".show-more-less-html__markup, .description__text");
  if (!descEl) return null;

  // Clean HTML from description
  for (const noise of descEl.querySelectorAll("button, svg, script, style")) {
    noise.remove();
  }

  const descText = descEl.text.replace(/\s+/g, " ").replace(/<br\s*\/?>/gi, "\n").trim();
  if (!descText) return null;

  const header = [company, title].filter(Boolean).join(": ");
  const meta = facts.join(" · ");

  return [header, meta, descText].filter(Boolean).join("\n\n");
}

export const linkedin: JobSourceAdapter<"LINKEDIN"> = {
  source: "LINKEDIN",
  async search(query: SearchQuery, _credentials, next: string | null, context: RequestContext = {}): Promise<SearchPage> {
    const base = context.baseUrl ?? LINKEDIN_BASE;
    const url = new URL("/jobs-guest/jobs/api/seeMoreJobPostings/search", base);

    if (query.keywords) url.searchParams.set("keywords", query.keywords);

    const locations = [query.place, query.country].filter(Boolean);
    if (locations.length > 0) url.searchParams.set("location", locations.join(", "));

    if (query.radiusKm) {
      // Convert km to miles for LinkedIn (approx 1 km ≈ 0.62 miles)
      url.searchParams.set("distance", String(Math.max(10, Math.round(query.radiusKm * 0.62))));
    }

    if (query.remoteOnly) url.searchParams.set("f_WT", "2");

    const timeFilter = POSTED_TIME_FILTERS[query.postedWithin];
    if (timeFilter) url.searchParams.set("f_TPR", timeFilter);

    if (query.experience) {
      const expFilter = EXPERIENCE_FILTERS[query.experience];
      if (expFilter) url.searchParams.set("f_E", expFilter);
    }

    const start = next ? parseInt(next, 10) : 0;
    url.searchParams.set("start", String(Number.isNaN(start) ? 0 : start));

    const html = await requestHtml("LINKEDIN", url, { signal: context.signal });
    const postings = parseLinkedInPostings(html);

    // If we received results and count is at least 10, paginate next 25
    const nextOffset = postings.length >= 10 ? String(start + 25) : null;

    return {
      postings,
      next: nextOffset,
    };
  },

  async details(posting: FoundPosting, _credentials, context: RequestContext = {}): Promise<string | null> {
    const base = context.baseUrl ?? LINKEDIN_BASE;
    const url = new URL(`/jobs-guest/jobs/api/jobPosting/${posting.externalId}`, base);

    try {
      const html = await requestHtml("LINKEDIN", url, { signal: context.signal });
      return parseLinkedInDetails(html, posting);
    } catch {
      return null;
    }
  },

  async test(_credentials, context: RequestContext = {}): Promise<void> {
    const base = context.baseUrl ?? LINKEDIN_BASE;
    const url = new URL("/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=engineer&start=0", base);
    await requestHtml("LINKEDIN", url, { signal: context.signal });
  },
};
