"use client";

import { useState, useTransition } from "react";
import {
  Briefcase,
  Calendar,
  Check,
  Compass,
  Copy,
  HelpCircle,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";

import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import {
  interviewPrepToMarkdown,
  type DeRiskItem,
  type InterviewPrep,
  type InterviewQuestion,
  type ReverseQuestion,
  type StarStory,
} from "@/lib/interview-prep-data";

import { clearInterviewPrepAction, generateInterviewPrepAction } from "./actions";

export function InterviewPrepTab({
  applicationId,
  interviewPrep,
  aiReady,
  company,
  role,
}: {
  applicationId: string;
  interviewPrep: InterviewPrep | null;
  aiReady: boolean;
  company: string;
  role: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string, label: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast(`Copied ${label}.`);
    } else {
      toast("Couldn't copy text automatically. Please select and copy manually.");
    }
  };

  const handleGenerate = () => {
    if (!aiReady) {
      toast("AI is not configured. Please choose an AI provider in Settings → AI Provider.");
      return;
    }
    startTransition(async () => {
      try {
        await generateInterviewPrepAction({ id: applicationId });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to generate interview prep.");
      }
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      try {
        await clearInterviewPrepAction({ id: applicationId });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to clear interview prep.");
      }
    });
  };

  if (!interviewPrep) {
    return (
      <div className="flex flex-1 flex-col items-center overflow-auto bg-canvas px-6 pt-10 pb-16 sm:px-10">
        <div className="flex w-full max-w-[680px] flex-col items-start gap-4 rounded-panel border border-line-card bg-card p-8">
          <div className="flex items-center gap-2.5 text-accent">
            <Sparkles className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Career-Ops Intelligence
            </span>
          </div>

          <h2 className="font-serif text-2xl font-normal text-ink">Interview Intelligence & Prep Pack</h2>

          <p className="text-sm leading-relaxed text-muted">
            Generate an executive-grade interview intelligence dossier tailored to {company || "the company"} and the {role || "target"} role. Dossier cross-references your profile and the posting to produce:
          </p>

          <div className="grid w-full grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-card border border-line/60 bg-canvas/40 p-3.5">
              <Compass className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <h3 className="text-xs font-semibold text-ink">STAR Story Bank</h3>
                <p className="text-xs text-muted">Grounds your real past achievements in the Situation-Task-Action-Result format.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-card border border-line/60 bg-canvas/40 p-3.5">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <h3 className="text-xs font-semibold text-ink">Round-by-Round Q&A</h3>
                <p className="text-xs text-muted">Recruiter screen, hiring manager deep-dive, and technical panel questions with hidden intents.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-card border border-line/60 bg-canvas/40 p-3.5">
              <Target className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <h3 className="text-xs font-semibold text-ink">Reverse Questions</h3>
                <p className="text-xs text-muted">High-signal questions to ask the hiring manager, tech lead, and peer interviewers.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-card border border-line/60 bg-canvas/40 p-3.5">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <h3 className="text-xs font-semibold text-ink">De-Risking Talking Points</h3>
                <p className="text-xs text-muted">Identify potential gaps or background transitions and deliver confident talking points.</p>
              </div>
            </div>
          </div>

          <Button
            className="mt-3"
            aria-disabled={isPending || undefined}
            onClick={handleGenerate}
          >
            {isPending ? "Generating interview intelligence…" : "Generate Interview Prep"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 overflow-auto bg-canvas px-6 pt-8 pb-16 sm:px-10">
      {/* Top action bar */}
      <div className="flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3 text-meta text-muted">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">Interview Intelligence</span>
          <span>·</span>
          <span>{company || "Company"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCopy(interviewPrepToMarkdown(interviewPrep), "all", "complete prep guide in Markdown")}
          >
            {copiedId === "all" ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
            Copy Markdown
          </Button>

          <Button
            variant="secondary"
            size="sm"
            aria-disabled={isPending || undefined}
            onClick={handleClear}
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            {isPending ? "Updating…" : "Regenerate"}
          </Button>
        </div>
      </div>

      {/* Role Strategy & 90-Day Plan Card */}
      <section className="flex w-full max-w-[760px] flex-col gap-4 rounded-panel border border-line-card bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 text-ink">
          <Briefcase className="size-4 text-accent" />
          <h2 className="text-sm font-semibold tracking-tight uppercase">Strategic Overview & 90-Day Execution</h2>
        </div>
        <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-wrap">{interviewPrep.roleOverview}</p>

        <div className="mt-2 rounded-card border border-line/60 bg-canvas/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Calendar className="size-3.5" />
            <span>First 90 Days Roadmap</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink/80 whitespace-pre-wrap">{interviewPrep.first90Days}</p>
        </div>
      </section>

      {/* STAR Story Bank */}
      <section className="flex w-full max-w-[760px] flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-tight text-muted">STAR Story Bank</h2>
          </div>
          <span className="text-xs text-muted">{interviewPrep.starStories.length} tailored stories</span>
        </div>

        <div className="flex flex-col gap-3">
          {interviewPrep.starStories.map((story: StarStory, i: number) => (
            <div key={i} className="rounded-panel border border-line-card bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    {story.competency}
                  </span>
                  <span className="text-xs text-muted">from {story.project}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `Competency: ${story.competency}\nProject: ${story.project}\nSituation: ${story.situation}\nTask: ${story.task}\nAction: ${story.action}\nResult: ${story.result}`,
                      `star-${i}`,
                      "STAR story",
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                >
                  {copiedId === `star-${i}` ? <Check className="size-3" /> : <Copy className="size-3" />}
                  <span>{copiedId === `star-${i}` ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 text-xs leading-relaxed sm:grid-cols-2">
                <div className="rounded border border-line/40 bg-canvas/30 p-2.5">
                  <span className="font-semibold text-ink">Situation:</span>{" "}
                  <span className="text-muted">{story.situation}</span>
                </div>
                <div className="rounded border border-line/40 bg-canvas/30 p-2.5">
                  <span className="font-semibold text-ink">Task:</span>{" "}
                  <span className="text-muted">{story.task}</span>
                </div>
                <div className="rounded border border-line/40 bg-canvas/30 p-2.5">
                  <span className="font-semibold text-ink">Action:</span>{" "}
                  <span className="text-muted">{story.action}</span>
                </div>
                <div className="rounded border border-accent/20 bg-accent/5 p-2.5">
                  <span className="font-semibold text-accent">Result:</span>{" "}
                  <span className="text-ink">{story.result}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Round-by-Round Interview Q&A */}
      <section className="flex w-full max-w-[760px] flex-col gap-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-tight text-muted">Round-by-Round Q&A Simulator</h2>
        </div>

        {/* Recruiter Screen */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Recruiter Screen</h3>
          {interviewPrep.recruiterQuestions.map((q: InterviewQuestion, i: number) => (
            <QuestionCard key={i} id={`rec-${i}`} q={q} copiedId={copiedId} onCopy={handleCopy} />
          ))}
        </div>

        {/* Hiring Manager Deep-Dive */}
        <div className="mt-2 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Hiring Manager Deep-Dive</h3>
          {interviewPrep.hiringManagerQuestions.map((q: InterviewQuestion, i: number) => (
            <QuestionCard key={i} id={`hm-${i}`} q={q} copiedId={copiedId} onCopy={handleCopy} />
          ))}
        </div>

        {/* Technical & Domain Panel */}
        <div className="mt-2 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Technical & Domain Panel</h3>
          {interviewPrep.technicalQuestions.map((q: InterviewQuestion, i: number) => (
            <QuestionCard key={i} id={`tech-${i}`} q={q} copiedId={copiedId} onCopy={handleCopy} />
          ))}
        </div>
      </section>

      {/* High-Signal Reverse Questions to Ask */}
      <section className="flex w-full max-w-[760px] flex-col gap-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-tight text-muted">High-Signal Reverse Questions to Ask</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {interviewPrep.reverseQuestions.map((rq: ReverseQuestion, i: number) => (
            <div key={i} className="flex flex-col justify-between gap-3 rounded-panel border border-line-card bg-card p-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">For {rq.target}</span>
                <p className="mt-1 text-xs font-medium text-ink">“{rq.question}”</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted"><span className="font-medium text-ink">Hidden signal:</span> {rq.whyItMatters}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(rq.question, `rev-${i}`, "reverse question")}
                className="inline-flex self-start items-center gap-1 text-[11px] text-muted hover:text-ink"
              >
                {copiedId === `rev-${i}` ? <Check className="size-3" /> : <Copy className="size-3" />}
                <span>{copiedId === `rev-${i}` ? "Copied question" : "Copy question"}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* De-Risking Talking Points */}
      <section className="flex w-full max-w-[760px] flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-tight text-muted">De-Risking Guide & Transition Talking Points</h2>
        </div>

        <div className="flex flex-col gap-3">
          {interviewPrep.deRiskingGuide.map((item: DeRiskItem, i: number) => (
            <div key={i} className="rounded-panel border border-line-card bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Potential Gap / Hesitation</span>
                  <p className="mt-0.5 text-xs font-medium text-ink">{item.gapOrRisk}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(item.talkingPoint, `derisk-${i}`, "talking point")}
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink shrink-0"
                >
                  {copiedId === `derisk-${i}` ? <Check className="size-3" /> : <Copy className="size-3" />}
                  <span>{copiedId === `derisk-${i}` ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="mt-2.5 rounded border border-line/40 bg-canvas/40 p-3">
                <span className="text-[11px] font-semibold text-ink">Recommended Response:</span>
                <p className="mt-1 text-xs leading-relaxed text-muted">{item.talkingPoint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cold Outreach & Post-Interview Follow-Up Templates */}
      <section className="flex w-full max-w-[760px] flex-col gap-4">
        <div className="flex items-center gap-2">
          <Send className="size-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-tight text-muted">3-Sentence Outreach & Follow-Up Templates</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OutreachCard
            title="Hiring Manager Cold Outreach"
            subtitle="Vision & impact hook"
            text={interviewPrep.outreach.hiringManager}
            id="out-hm"
            copiedId={copiedId}
            onCopy={handleCopy}
          />
          <OutreachCard
            title="Recruiter Direct InMail"
            subtitle="Qualifications & availability"
            text={interviewPrep.outreach.recruiter}
            id="out-rec"
            copiedId={copiedId}
            onCopy={handleCopy}
          />
          <OutreachCard
            title="Peer / Future Teammate"
            subtitle="Engineering curiosity & culture"
            text={interviewPrep.outreach.peer}
            id="out-peer"
            copiedId={copiedId}
            onCopy={handleCopy}
          />
          <OutreachCard
            title="Post-Interview Thank You Note"
            subtitle="Send within 12 hours of interview"
            text={interviewPrep.outreach.thankYouFollowUp}
            id="out-ty"
            copiedId={copiedId}
            onCopy={handleCopy}
          />
        </div>
      </section>
    </div>
  );
}

function QuestionCard({
  id,
  q,
  copiedId,
  onCopy,
}: {
  id: string;
  q: InterviewQuestion;
  copiedId: string | null;
  onCopy: (text: string, id: string, label: string) => void;
}) {
  return (
    <div className="rounded-panel border border-line-card bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-xs font-semibold text-ink">“{q.question}”</h4>
        <button
          type="button"
          onClick={() => onCopy(q.suggestedAnswer, id, "answer talking points")}
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink shrink-0"
        >
          {copiedId === id ? <Check className="size-3" /> : <Copy className="size-3" />}
          <span>{copiedId === id ? "Copied" : "Copy answer"}</span>
        </button>
      </div>

      <div className="mt-2 text-[11px] text-muted">
        <span className="font-semibold text-ink">Hidden intent:</span> {q.intent}
      </div>

      <div className="mt-2.5 rounded border border-line/40 bg-canvas/40 p-2.5 text-xs leading-relaxed text-ink/90">
        <span className="font-semibold text-ink">Suggested answer strategy:</span>
        <p className="mt-1 text-xs text-muted">{q.suggestedAnswer}</p>
      </div>
    </div>
  );
}

function OutreachCard({
  title,
  subtitle,
  text,
  id,
  copiedId,
  onCopy,
}: {
  title: string;
  subtitle: string;
  text: string;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string, label: string) => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-panel border border-line-card bg-card p-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-ink">{title}</h4>
        </div>
        <span className="text-[11px] text-muted">{subtitle}</span>
        <p className="mt-2 text-xs leading-relaxed text-ink/90 whitespace-pre-wrap">{text}</p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="self-start text-[11px]"
        onClick={() => onCopy(text, id, title)}
      >
        {copiedId === id ? <Check className="mr-1.5 size-3" /> : <Copy className="mr-1.5 size-3" />}
        {copiedId === id ? "Copied" : "Copy message"}
      </Button>
    </div>
  );
}
