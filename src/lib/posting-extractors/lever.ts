import "server-only";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import type { ExtractorOptions, ExtractedResult } from "./types";

export function isLeverUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "jobs.lever.co";
}

export function extractLeverParams(url: URL): { company: string; id: string } | null {
  const pathMatch = /^\/([^/]+)\/([a-f0-9-]+)/i.exec(url.pathname);
  if (pathMatch) {
    return { company: pathMatch[1], id: pathMatch[2] };
  }
  return null;
}

export async function extractLeverPosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isLeverUrl(url)) return null;

  const params = extractLeverParams(url);
  if (params) {
    const apiUrl = `https://api.lever.co/v0/postings/${params.company}/${params.id}`;
    const page: FetchedPage = await fetchHtml(apiUrl, {
      lookup: options.lookup,
      timeoutMs: options.timeoutMs,
    });

    if (page.ok) {
      try {
        const data = JSON.parse(page.html) as Record<string, unknown>;
        const title = String(data.text ?? "").trim();
        const categories = (data.categories as Record<string, unknown> | undefined) ?? {};
        const location = String(categories.location ?? "").trim();
        const commitment = String(categories.commitment ?? "").trim();
        const team = String(categories.team ?? categories.department ?? "").trim();

        const desc = String(data.descriptionPlain ?? data.description ?? "").trim();
        const additional = String(data.additionalPlain ?? data.additional ?? "").trim();
        const lists = (data.lists as Array<{ text?: string; content?: string }> | undefined) ?? [];
        const listsText = lists
          .map((list) => {
            const h = String(list.text ?? "").trim();
            const c = String(list.content ?? "").trim();
            return [h, c].filter(Boolean).join("\n");
          })
          .filter(Boolean)
          .join("\n\n");

        const fullDesc = [desc, listsText, additional].filter(Boolean).join("\n\n");
        const facts = [location, commitment, team].filter(Boolean).join(" · ");
        const companyName = params.company.charAt(0).toUpperCase() + params.company.slice(1);
        const header = `${companyName}: ${title}`;
        const text = [header, facts, fullDesc].filter(Boolean).join("\n\n");

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
