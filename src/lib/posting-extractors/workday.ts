import "server-only";

import { parse } from "node-html-parser";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import { renderPageWithBrowser } from "./browser-fallback";
import type { ExtractorOptions, ExtractedResult } from "./types";

export function isWorkdayUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host.includes("myworkdayjobs.com");
}

export function extractWorkdayParams(url: URL): { tenant: string; site: string; jobPath: string } | null {
  const hostParts = url.hostname.split(".");
  const tenant = hostParts[0];
  if (!tenant) return null;

  // Path matches: [/<locale>]/<site>/job/<path>
  const match = /(?:^\/[a-zA-Z_]{2,5})?\/([^/]+)\/job\/(.+)/i.exec(url.pathname);
  if (match) {
    return {
      tenant,
      site: match[1],
      jobPath: match[2],
    };
  }

  return null;
}

export async function extractWorkdayPosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isWorkdayUrl(url)) return null;

  const params = extractWorkdayParams(url);
  if (params) {
    const apiUrl = `https://${url.hostname}/wday/cxs/${params.tenant}/${params.site}/job/${params.jobPath}`;
    const page: FetchedPage = await fetchHtml(apiUrl, {
      lookup: options.lookup,
      timeoutMs: options.timeoutMs,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    if (page.ok) {
      try {
        const data = JSON.parse(page.html) as { jobPostingInfo?: Record<string, unknown> };
        const info = data.jobPostingInfo;
        if (info) {
          const title = String(info.title ?? "").trim();
          const location = String(info.location ?? info.locationsText ?? "").trim();
          const timeType = String(info.timeType ?? "").trim();
          const postedOn = String(info.postedOn ?? "").trim();

          const rawDesc = String(info.jobDescription ?? "");
          const descParsed = parse(rawDesc);
          const description = descParsed.text.replace(/\s+/g, " ").replace(/<br\s*\/?>/gi, "\n").trim();

          const companyName = params.tenant.charAt(0).toUpperCase() + params.tenant.slice(1);
          const header = `${companyName}: ${title}`;
          const facts = [location, timeType, postedOn].filter(Boolean).join(" · ");
          const text = [header, facts, description].filter(Boolean).join("\n\n");

          if (text.length >= 200) {
            return {
              ok: true,
              text,
              source: "structured",
              url: url.toString(),
            };
          }
        }
      } catch {
        // Fall back to browser rendering
      }
    }
  }

  // Workday is a heavy client-side SPA, so fall back to browser rendering
  const browserHtml = await renderPageWithBrowser(url.toString(), options.timeoutMs);
  if (browserHtml) {
    const parsed = postingFromHtml(browserHtml);
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
