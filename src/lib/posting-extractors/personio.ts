import "server-only";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import type { ExtractorOptions, ExtractedResult } from "./types";

export function isPersonioUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host.includes(".jobs.personio.");
}

export async function extractPersonioPosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isPersonioUrl(url)) return null;

  const page: FetchedPage = await fetchHtml(url.toString(), {
    lookup: options.lookup,
    timeoutMs: options.timeoutMs,
  });

  if (page.ok) {
    const parsed = postingFromHtml(page.html);
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
