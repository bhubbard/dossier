import "server-only";

import { parse } from "node-html-parser";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import type { ExtractorOptions, ExtractedResult } from "./types";

export function isSmartRecruitersUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com";
}

export function extractSmartRecruitersParams(url: URL): { company: string; id: string } | null {
  const match = /^\/([^/]+)\/([a-zA-Z0-9_-]+)/i.exec(url.pathname);
  if (match) {
    return { company: match[1], id: match[2] };
  }
  return null;
}

export async function extractSmartRecruitersPosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isSmartRecruitersUrl(url)) return null;

  const params = extractSmartRecruitersParams(url);
  if (params) {
    const apiUrl = `https://api.smartrecruiters.com/v1/companies/${params.company}/postings/${params.id}`;
    const page: FetchedPage = await fetchHtml(apiUrl, {
      lookup: options.lookup,
      timeoutMs: options.timeoutMs,
    });

    if (page.ok) {
      try {
        const data = JSON.parse(page.html) as Record<string, unknown>;
        const title = String(data.name ?? "").trim();
        const companyObj = data.company as Record<string, unknown> | undefined;
        const company = String(companyObj?.name ?? params.company).trim();

        const loc = data.location as Record<string, unknown> | undefined;
        const locationParts = [loc?.city, loc?.region, loc?.country].filter(Boolean).map(String);
        const location = locationParts.join(", ");

        const typeObj = data.typeOfEmployment as Record<string, unknown> | undefined;
        const employmentType = String(typeObj?.label ?? "").trim();

        const jobAd = data.jobAd as { sections?: Record<string, { title?: string; text?: string }> } | undefined;
        const sections = jobAd?.sections ?? {};

        const sectionsText = Object.values(sections)
          .map((s) => {
            const heading = s.title ? `${s.title}:` : "";
            const body = s.text ? parse(s.text).text.replace(/\s+/g, " ").trim() : "";
            return [heading, body].filter(Boolean).join("\n");
          })
          .filter(Boolean)
          .join("\n\n");

        const header = `${company}: ${title}`;
        const facts = [location, employmentType].filter(Boolean).join(" · ");
        const text = [header, facts, sectionsText].filter(Boolean).join("\n\n");

        if (text.length >= 200) {
          return {
            ok: true,
            text,
            source: "structured",
            url: url.toString(),
          };
        }
      } catch {
        // Fall back to page HTML
      }
    }
  }

  // Fallback to regular HTML fetch
  const htmlPage = await fetchHtml(url.toString(), { lookup: options.lookup, timeoutMs: options.timeoutMs });
  if (htmlPage.ok) {
    const parsed = postingFromHtml(htmlPage.html);
    if (parsed) {
      return {
        ok: true,
        text: parsed.text,
        source: parsed.source,
        url: url.toString(),
      };
    }
  }

  return null;
}
