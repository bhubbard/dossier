import "server-only";

import { extractAshbyPosting, isAshbyUrl } from "./ashby";
import { extractBambooHrPosting, isBambooHrUrl } from "./bamboohr";
import { extractGreenhousePosting, isGreenhouseUrl } from "./greenhouse";
import { extractIndeedPosting, isIndeedUrl } from "./indeed";
import { extractLeverPosting, isLeverUrl } from "./lever";
import { extractLinkedInPosting, isLinkedInUrl } from "./linkedin";
import { extractPersonioPosting, isPersonioUrl } from "./personio";
import { extractSmartRecruitersPosting, isSmartRecruitersUrl } from "./smartrecruiters";
import type { ExtractorOptions, ExtractedResult } from "./types";
import { extractWorkdayPosting, isWorkdayUrl } from "./workday";

export * from "./types";
export * from "./browser-fallback";
export * from "./linkedin";
export * from "./indeed";
export * from "./greenhouse";
export * from "./lever";
export * from "./ashby";
export * from "./workday";
export * from "./smartrecruiters";
export * from "./bamboohr";
export * from "./personio";

/**
 * Attempts to parse a job link with specialized handlers for LinkedIn, Indeed,
 * Greenhouse, Lever, Ashby, Workday, SmartRecruiters, BambooHR, and Personio.
 * Returns null if the URL does not match any specialized platform or if the
 * specialized handler yields to the general fetcher.
 */
export async function trySpecializedExtractors(url: URL, options: ExtractorOptions = {}): Promise<ExtractedResult | null> {
  if (isLinkedInUrl(url)) {
    const result = await extractLinkedInPosting(url, options);
    if (result) return result;
  }

  if (isIndeedUrl(url)) {
    const result = await extractIndeedPosting(url, options);
    if (result) return result;
  }

  if (isWorkdayUrl(url)) {
    const result = await extractWorkdayPosting(url, options);
    if (result) return result;
  }

  if (isGreenhouseUrl(url)) {
    const result = await extractGreenhousePosting(url, options);
    if (result) return result;
  }

  if (isLeverUrl(url)) {
    const result = await extractLeverPosting(url, options);
    if (result) return result;
  }

  if (isSmartRecruitersUrl(url)) {
    const result = await extractSmartRecruitersPosting(url, options);
    if (result) return result;
  }

  if (isAshbyUrl(url)) {
    const result = await extractAshbyPosting(url, options);
    if (result) return result;
  }

  if (isBambooHrUrl(url)) {
    const result = await extractBambooHrPosting(url, options);
    if (result) return result;
  }

  if (isPersonioUrl(url)) {
    const result = await extractPersonioPosting(url, options);
    if (result) return result;
  }

  return null;
}
