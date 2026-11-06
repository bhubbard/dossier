import "server-only";

import type { LookupFunction } from "node:net";

export type ExtractorOptions = {
  lookup?: LookupFunction;
  timeoutMs?: number;
};

export type ExtractedResult =
  | { ok: true; text: string; source: "structured" | "page"; url: string }
  | { ok: false; error: string };
