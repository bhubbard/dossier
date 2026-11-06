import "server-only";

import { parse } from "node-html-parser";

import { fetchHtml, postingFromHtml, type FetchedPage } from "@/lib/posting-fetch";

import { renderPageWithBrowser } from "./browser-fallback";
import type { ExtractorOptions, ExtractedResult } from "./types";

const BROWSER_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export function isIndeedUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === "indeed.com" || host.endsWith(".indeed.com");
}

export function extractIndeedJobKey(url: URL): string | null {
  const jkParam = url.searchParams.get("jk") || url.searchParams.get("id") || url.searchParams.get("vjk");
  if (jkParam && /^[a-f0-9]+$/i.test(jkParam)) return jkParam;

  const pathMatch = /\/job\/(?:[a-zA-Z0-9\-_]+-)?([a-f0-9]{16,})/i.exec(url.pathname);
  if (pathMatch) return pathMatch[1];

  const viewJobMatch = /\/viewjob[/?].*?[?&](?:jk|id)=([a-f0-9]+)/i.exec(url.href);
  if (viewJobMatch) return viewJobMatch[1];

  return null;
}

export function parseIndeedHtml(html: string): { text: string } | null {
  const structured = postingFromHtml(html);
  if (structured && structured.source === "structured") return { text: structured.text };

  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false, pre: true } });

  const title = (
    root.querySelector("h1.jobsearch-JobInfoHeader-title, [data-testid='simpler-jobTitle'], h1")?.text ?? ""
  ).trim();

  const company = (
    root.querySelector("[data-testid='inlineHeader-companyName'], .jobsearch-CompanyInfoContainer a, [data-testid='company-name']")?.text ?? ""
  ).trim();

  const location = (
    root.querySelector("[data-testid='inlineHeader-companyLocation'], [data-testid='job-location']")?.text ?? ""
  ).trim();

  const descEl = root.querySelector("#jobDescriptionText, .jobsearch-JobComponent-description, .jobsearch-jobDescriptionText");
  if (!descEl) return null;

  for (const noise of descEl.querySelectorAll("button, svg, script, style")) {
    noise.remove();
  }

  const descText = descEl.text.replace(/\s+/g, " ").replace(/<br\s*\/?>/gi, "\n").trim();
  if (descText.length < 150) return null;

  const header = [company, title].filter(Boolean).join(": ");
  const text = [header, location, descText].filter(Boolean).join("\n\n");

  return { text };
}

export async function extractIndeedPosting(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (!isIndeedUrl(url)) return null;

  const jobKey = extractIndeedJobKey(url);
  const targetUrl = jobKey ? `https://www.indeed.com/m/viewjob?id=${jobKey}` : url.toString();

  // 1. Try mobile fetch
  const page: FetchedPage = await fetchHtml(targetUrl, {
    lookup: options.lookup,
    timeoutMs: options.timeoutMs,
    userAgent: BROWSER_UA,
  });

  if (page.ok) {
    const parsed = parseIndeedHtml(page.html);
    if (parsed) {
      return {
        ok: true,
        text: parsed.text,
        source: "page",
        url: targetUrl,
      };
    }
  }

  // 2. If blocked (403/captcha) or unreadable, fall back to headless browser rendering
  const browserHtml = await renderPageWithBrowser(url.toString(), options.timeoutMs);
  if (browserHtml) {
    const parsed = parseIndeedHtml(browserHtml);
    if (parsed) {
      return {
        ok: true,
        text: parsed.text,
        source: "page",
        url: url.toString(),
      };
    }
  }

  return null;
}
