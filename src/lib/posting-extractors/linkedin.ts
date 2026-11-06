import "server-only";

import { parse } from "node-html-parser";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import { renderPageWithBrowser } from "./browser-fallback";
import type { ExtractorOptions, ExtractedResult } from "./types";

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function isLinkedInUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

export function extractLinkedInJobId(url: URL): string | null {
  const pathMatch = /jobs\/view\/(?:[a-zA-Z0-9\-_]+-)?(\d+)/i.exec(url.pathname);
  if (pathMatch) return pathMatch[1];

  const searchMatch = /[?&]currentJobId=(\d+)/i.exec(url.search);
  if (searchMatch) return searchMatch[1];

  const queryParam = url.searchParams.get("currentJobId");
  if (queryParam && /^\d+$/.test(queryParam)) return queryParam;

  return null;
}

export function parseLinkedInGuestHtml(html: string): { text: string } | null {
  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false, pre: true } });

  const title = (
    root.querySelector(".top-card-layout__title, .topcard__title, h2.topcard__title, h1")?.text ?? ""
  ).trim();

  const company = (
    root.querySelector(
      ".topcard__flavor--black-link, a[data-tracking-control-name='public_jobs_topcard-org-name'], .topcard__org-name-link, .topcard__flavor",
    )?.text ?? ""
  ).trim();

  const locationEl = root.querySelector(".topcard__flavor-row .topcard__flavor:not(.topcard__flavor--bullet)");
  const location = (locationEl?.text ?? "").trim();

  const facts: string[] = [];
  if (location) facts.push(location);

  const criteriaItems = root.querySelectorAll(".description__job-criteria-item");
  for (const item of criteriaItems) {
    const label = (item.querySelector("h3")?.text ?? "").trim();
    const value = (item.querySelector("span")?.text ?? "").trim();
    if (value && label) facts.push(`${label}: ${value}`);
  }

  const descEl = root.querySelector(".show-more-less-html__markup, .description__text");
  if (!descEl) return null;

  for (const noise of descEl.querySelectorAll("button, svg, script, style")) {
    noise.remove();
  }

  const descText = descEl.text.replace(/\s+/g, " ").replace(/<br\s*\/?>/gi, "\n").trim();
  if (descText.length < 150) return null;

  const header = [company, title].filter(Boolean).join(": ");
  const meta = facts.join(" · ");
  const text = [header, meta, descText].filter(Boolean).join("\n\n");

  return { text };
}

export async function extractLinkedInPosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isLinkedInUrl(url)) return null;

  const jobId = extractLinkedInJobId(url);
  if (jobId) {
    const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    const page: FetchedPage = await fetchHtml(guestUrl, {
      lookup: options.lookup,
      timeoutMs: options.timeoutMs,
      userAgent: BROWSER_UA,
    });

    if (page.ok) {
      const parsed = parseLinkedInGuestHtml(page.html);
      if (parsed) {
        return {
          ok: true,
          text: parsed.text,
          source: "structured",
          url: `https://www.linkedin.com/jobs/view/${jobId}`,
        };
      }
    }
  }

  // Fallback to browser rendering if guest API didn't return or no jobId was in the URL
  const browserHtml = await renderPageWithBrowser(url.toString(), options.timeoutMs);
  if (browserHtml) {
    const fromStructured = postingFromHtml(browserHtml);
    if (fromStructured) {
      return {
        ok: true,
        text: fromStructured.text,
        source: fromStructured.source,
        url: url.toString(),
      };
    }
    const fromGuest = parseLinkedInGuestHtml(browserHtml);
    if (fromGuest) {
      return {
        ok: true,
        text: fromGuest.text,
        source: "structured",
        url: url.toString(),
      };
    }
  }

  return null;
}
