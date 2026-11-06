import "server-only";

import { parse } from "node-html-parser";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import type { ExtractorOptions, ExtractedResult } from "./types";

export function isGreenhouseUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io";
}

export function extractGreenhouseParams(url: URL): { company: string; id: string } | null {
  const tokenParam = url.searchParams.get("token");
  const forParam = url.searchParams.get("for");
  if (tokenParam && forParam) {
    return { company: forParam, id: tokenParam };
  }

  const pathMatch = /\/([^/]+)\/jobs\/(\d+)/i.exec(url.pathname);
  if (pathMatch) {
    return { company: pathMatch[1], id: pathMatch[2] };
  }

  return null;
}

export async function extractGreenhousePosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isGreenhouseUrl(url)) return null;

  const params = extractGreenhouseParams(url);
  if (params) {
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${params.company}/jobs/${params.id}`;
    const page: FetchedPage = await fetchHtml(apiUrl, {
      lookup: options.lookup,
      timeoutMs: options.timeoutMs,
    });

    if (page.ok) {
      try {
        const data = JSON.parse(page.html) as Record<string, unknown>;
        const title = String(data.title ?? "").trim();
        const locationObj = data.location as Record<string, unknown> | undefined;
        const location = String(locationObj?.name ?? "").trim();
        const depts = (data.departments as Array<{ name?: string }> | undefined)?.map((d) => d.name).filter(Boolean) ?? [];
        const contentRaw = String(data.content ?? "");
        let description = parse(contentRaw).text;
        if (/&lt;|&gt;|<\/?(p|li|ul|br|div|strong)\b/i.test(description)) {
          description = parse(description.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")).text;
        }
        description = description.replace(/\s+/g, " ").trim();

        const facts = [location, depts.join(", ")].filter(Boolean).join(" · ");
        const companyName = params.company.charAt(0).toUpperCase() + params.company.slice(1);
        const header = `${companyName}: ${title}`;
        const text = [header, facts, description].filter(Boolean).join("\n\n");

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
