"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { AlertTriangle, DollarSign, Layers, Sparkles, Wifi } from "lucide-react";

import { FactList } from "@/components/fact-list";
import { MatchRows } from "@/components/match-rows";
import type { Match, Requirement } from "@/lib/application-data";
import { analyzePostingSignals, detectRoleArchetype } from "@/lib/posting-analysis";
import type { FactItem } from "@/lib/profile";

import { sectionHref } from "../../profile/sections";

/** The Job posting tab's posting, as saved with the application. */
export type PostingData = {
  text: string;
  /** The saved link to the posting, or "". */
  url: string;
  /** When it was pasted, e.g. "27 Sep". */
  pasted: string;
};

/** "jobs.ledgerly.com/senior-designer" for a link, without the scheme. */
function shortLink(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === "/" ? "" : pathname}`;
  } catch {
    return url;
  }
}

/**
 * The Job posting tab (APP-11): what the user tells the AI for this
 * application (APP-15), how the profile matches the posting and the posting
 * as pasted, whitespace kept, with a link to the original if saved.
 */
export function PostingTab({
  applicationId,
  posting,
  match,
  requirements,
  onAddSkill,
  facts,
  setFacts,
}: {
  applicationId: string;
  posting: PostingData;
  match: Match | null;
  requirements: Requirement[];
  onAddSkill: (index: number, skill: string) => void;
  facts: FactItem[];
  setFacts: (change: (facts: FactItem[]) => FactItem[]) => void;
}) {
  const factsHint = useId();
  const archetype = useMemo(() => (posting.text.trim() ? detectRoleArchetype(posting.text) : null), [posting.text]);
  const signals = useMemo(() => (posting.text.trim() ? analyzePostingSignals(posting.text) : null), [posting.text]);

  return (
    <div className="@container flex flex-1 flex-col items-center gap-4 overflow-auto bg-canvas px-10 pt-11 pb-16">
      <section
        aria-labelledby={`${factsHint}-title`}
        aria-describedby={factsHint}
        className="flex w-full max-w-[640px] flex-col gap-4 rounded-panel border border-line-card bg-card px-[30px] py-7"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={`${factsHint}-title`} className="text-[15px] font-medium">
            Facts for this application
          </h2>
          <p id={factsHint} className="text-sm text-pretty text-muted">
            What the AI should know for this job only, on top of your profile&apos;s{" "}
            <Link href={sectionHref("facts")} className="text-muted underline underline-offset-2 hover:text-ink">
              Facts about me
            </Link>
            . It uses them the next time it writes or rewrites something here.
          </p>
        </div>
        <FactList
          applicationId={applicationId}
          facts={facts}
          setFacts={setFacts}
          placeholder="e.g. I met their design lead at Config last year. Or: lean on my research work."
        />
      </section>
      <div className="flex w-full max-w-[640px] flex-wrap justify-between gap-x-3 gap-y-1 text-meta text-muted">
        <span className="min-w-0">
          Job posting
          {posting.url && (
            <>
              {" · "}
              <a
                href={posting.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-muted underline underline-offset-2 hover:text-ink"
              >
                {shortLink(posting.url)}
                <span aria-hidden="true"> ↗</span>{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </>
          )}
        </span>
        <span>Pasted {posting.pasted}</span>
      </div>

      {archetype && signals && (
        <div className="flex w-full max-w-[640px] flex-col gap-3.5 rounded-panel border border-line-card bg-card px-[30px] py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted">Role Intelligence</h2>
            </div>
            <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
              {archetype.label}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-muted">{archetype.tagline}</p>

          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded border border-line/40 bg-canvas/30 px-2.5 py-1.5 text-xs">
              <DollarSign className="size-3.5 text-muted shrink-0" />
              <span className="truncate text-ink">
                {signals.salaryTransparentNode ? "Pay Disclosed" : "Pay Not Disclosed"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded border border-line/40 bg-canvas/30 px-2.5 py-1.5 text-xs">
              <Wifi className="size-3.5 text-muted shrink-0" />
              <span className="truncate text-ink">
                {signals.remoteRealistic ? "Remote Realistic" : "Remote Ambiguity"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded border border-line/40 bg-canvas/30 px-2.5 py-1.5 text-xs">
              <Layers className="size-3.5 text-muted shrink-0" />
              <span className="truncate text-ink capitalize">
                Clarity: {signals.clarityScore}
              </span>
            </div>
          </div>

          {signals.redFlags.length > 0 && (
            <div className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <span className="font-semibold">Quality Signals Watch: </span>
                {signals.redFlags.join("; ")}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex w-full max-w-[640px] flex-col gap-[22px] rounded-panel border border-line-card bg-card px-[30px] py-7">
        {match && match.items.length > 0 && <MatchRows match={match} requirements={requirements} onAddSkill={onAddSkill} />}
        <div className={match && match.items.length > 0 ? "flex flex-col gap-2.5 border-t border-line pt-5" : "flex flex-col gap-2.5"}>
          <h2 className="text-[15px] font-medium">Original posting</h2>
          {posting.text.trim() ? (
            <p className="text-sm leading-[1.65] whitespace-pre-wrap text-document">{posting.text}</p>
          ) : (
            <p className="text-sm text-muted">No posting was saved with this application.</p>
          )}
        </div>
      </div>
    </div>
  );
}
