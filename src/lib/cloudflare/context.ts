import type { BrowserWorker } from "@cloudflare/puppeteer";
import type { D1Database, R2Bucket, KVNamespace } from "@cloudflare/workers-types";

export interface CloudflareEnv {
  DB?: D1Database;
  HYPERDRIVE?: { connectionString: string };
  DOSSIER_BUCKET?: R2Bucket;
  MYBROWSER?: BrowserWorker;
  AI?: {
    run: (model: string, input: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  };
  NEXT_CACHE_WORKERS_KV?: KVNamespace;
  [key: string]: unknown;
}

/**
 * Accesses Cloudflare Worker environment bindings safely in Server Components,
 * Server Actions, and API routes via @opennextjs/cloudflare.
 * Returns null if running in standard Node.js / Docker.
 */
export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    return (ctx?.env as CloudflareEnv) ?? null;
  } catch {
    return null;
  }
}

/** Whether the app is actively running inside a Cloudflare Worker environment. */
export async function isCloudflareWorker(): Promise<boolean> {
  const env = await getCloudflareEnv();
  return Boolean(env && (env.DB || env.DOSSIER_BUCKET || env.MYBROWSER || env.AI || env.NEXT_CACHE_WORKERS_KV));
}
