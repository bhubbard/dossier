import "server-only";

import type { BrowserWorker } from "@cloudflare/puppeteer";
import type { Browser } from "playwright-core";

import { getCloudflareEnv } from "@/lib/cloudflare/context";
import { env } from "@/lib/env";

import { printWithDesktopApp } from "./desktop-print";
import { PRINT_TOKEN_HEADER, signPrintToken } from "./print-token";

// PDFs are printed by headless Chromium from the app's own print pages, so
// they match the preview (RES-5, RES-7). When running on Cloudflare Workers,
// Cloudflare Browser Rendering (env.MYBROWSER with @cloudflare/puppeteer) is used.
// When running in Node.js / Docker, a local Playwright pool is used.

export const MAX_CONCURRENT_RENDERS = 2;
const IDLE_MS = 5 * 60_000;
const NAVIGATION_TIMEOUT_MS = 20_000;

type Pool = {
  browser: Promise<Browser> | null;
  active: number;
  queue: (() => void)[];
  idleTimer: ReturnType<typeof setTimeout> | null;
};

const globalForPdf = globalThis as unknown as { pdfPool?: Pool };
const pool: Pool = (globalForPdf.pdfPool ??= { browser: null, active: 0, queue: [], idleTimer: null });

function appOrigin(): string {
  return env.DOSSIER_PUBLIC_URL || `http://localhost:${process.env.PORT ?? 3000}`;
}

async function getLocalBrowser(): Promise<Browser> {
  if (!pool.browser) {
    const { chromium } = await import("playwright-core");
    const launching = chromium
      .launch({
        args: ["--disable-dev-shm-usage"],
      })
      .then((launched) => {
        launched.on("disconnected", () => {
          if (pool.browser === launching) pool.browser = null;
        });
        return launched;
      });
    launching.catch(() => {
      if (pool.browser === launching) pool.browser = null;
    });
    pool.browser = launching;
  }
  return pool.browser;
}

async function acquire(): Promise<void> {
  if (pool.idleTimer) clearTimeout(pool.idleTimer);
  pool.idleTimer = null;
  if (pool.active < MAX_CONCURRENT_RENDERS) {
    pool.active += 1;
    return;
  }
  await new Promise<void>((resolve) => pool.queue.push(resolve));
}

function release(): void {
  const next = pool.queue.shift();
  if (next) return next();
  pool.active -= 1;
  if (pool.active === 0) {
    pool.idleTimer = setTimeout(() => {
      const closing = pool.browser;
      pool.browser = null;
      void closing?.then((open) => open.close()).catch(() => {});
    }, IDLE_MS);
    pool.idleTimer.unref?.();
  }
}

/** Renders PDF using Cloudflare Browser Rendering API (env.MYBROWSER) */
async function renderWithCloudflareBrowser(browserBinding: BrowserWorker, path: string): Promise<Uint8Array> {
  const puppeteer = (await import("@cloudflare/puppeteer")).default;
  const browser = await puppeteer.launch(browserBinding);
  try {
    const page = await browser.newPage();
    const token = await signPrintToken(path);
    await page.setExtraHTTPHeaders({ [PRINT_TOKEN_HEADER]: token });
    const origin = appOrigin();
    const response = await page.goto(`${origin}${path}`, {
      waitUntil: "networkidle0",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    if (!response?.ok()) {
      throw new Error(`The print page ${path} answered ${response?.status() ?? "nothing"}.`);
    }
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const pdfBuffer = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return new Uint8Array(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Prints an app page (e.g. "/print/base") to a PDF at the page size its
 * print CSS sets.
 */
export async function renderPdf(path: string): Promise<Uint8Array> {
  if (env.DOSSIER_DESKTOP_PRINT_URL) return printWithDesktopApp(env.DOSSIER_DESKTOP_PRINT_URL, path);

  const cf = await getCloudflareEnv();
  if (cf?.MYBROWSER) {
    return renderWithCloudflareBrowser(cf.MYBROWSER, path);
  }

  await acquire();
  try {
    const origin = appOrigin();
    const context = await (await getLocalBrowser()).newContext({
      extraHTTPHeaders: { [PRINT_TOKEN_HEADER]: await signPrintToken(path) },
    });
    try {
      await context.route("**/*", (route) =>
        new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"),
      );
      const page = await context.newPage();
      const response = await page.goto(`${origin}${path}`, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT_MS });
      if (!response?.ok()) throw new Error(`The print page ${path} answered ${response?.status() ?? "nothing"}.`);
      if (response.request().redirectedFrom()) throw new Error(`The print page ${path} redirected to ${new URL(page.url()).pathname}.`);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      return await page.pdf({ preferCSSPageSize: true, printBackground: true });
    } finally {
      await context.close();
    }
  } finally {
    release();
  }
}
