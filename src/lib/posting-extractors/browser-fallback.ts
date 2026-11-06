import "server-only";

import { getCloudflareEnv } from "@/lib/cloudflare/context";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Attempts to render a page via headless browser (Cloudflare Browser Rendering or local Playwright)
 * to retrieve the rendered DOM of JavaScript-heavy job boards or pages requiring client-side execution.
 * Returns null if no browser environment is available or if navigation fails.
 */
export async function renderPageWithBrowser(url: string, timeoutMs: number = 15_000): Promise<string | null> {
  const cfEnv = await getCloudflareEnv();

  // 1. Cloudflare Browser Rendering (Production Edge)
  if (cfEnv?.MYBROWSER) {
    try {
      const puppeteer = await import("@cloudflare/puppeteer");
      const browser = await puppeteer.default.launch(cfEnv.MYBROWSER);
      try {
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.goto(url, { waitUntil: "networkidle0", timeout: timeoutMs });
        const html = await page.content();
        return html;
      } finally {
        await browser.close().catch(() => {});
      }
    } catch {
      return null;
    }
  }

  // 2. Local Playwright (Development / Docker / Node.js)
  try {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
    try {
      const context = await browser.newContext({ userAgent: USER_AGENT });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      // Give SPA frameworks a moment to hydrate
      await page.waitForTimeout(1500).catch(() => {});
      const html = await page.content();
      return html;
    } finally {
      await browser.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
