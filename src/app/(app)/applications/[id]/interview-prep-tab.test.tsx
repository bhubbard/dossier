import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { interviewPrepToMarkdown, type InterviewPrep } from "@/lib/interview-prep-data";

import { InterviewPrepTab } from "./interview-prep-tab";

vi.mock("@/components/toast", () => ({ toast: vi.fn() }));
vi.mock("./actions", () => ({
  generateInterviewPrepAction: vi.fn(),
  clearInterviewPrepAction: vi.fn(),
}));

const mockPrep: InterviewPrep = {
  roleOverview: "Strategic lead driving core payment gateway redesign.",
  first90Days: "Days 1-30: Shadow team. Days 31-60: Ship first integration. Days 61-90: Scale throughput.",
  starStories: [
    {
      competency: "System Resilience",
      project: "Checkout Engine v2",
      situation: "Legacy payment service crashed during Black Friday with 45% packet drop.",
      task: "Rebuild event queue with zero downtime and idempotent transaction ledger.",
      action: "Implemented Rust event-bus consumer and Redis cluster fallback with circuit breakers.",
      result: "Achieved 99.999% uptime processing 18k TPS with zero ledger corruption.",
    },
  ],
  recruiterQuestions: [
    {
      question: "Why are you interested in this role at Ledgerly?",
      intent: "Testing motivation, compensation expectations, and culture fit.",
      suggestedAnswer: "Ledgerly's distributed systems match my experience in high-throughput infrastructure.",
    },
  ],
  hiringManagerQuestions: [
    {
      question: "Tell me about a time you had to make a painful technical compromise.",
      intent: "Assessing pragmatism, business alignment, and technical maturity.",
      suggestedAnswer: "We opted for eventual consistency in reporting to prioritize real-time payment SLAs.",
    },
  ],
  technicalQuestions: [
    {
      question: "How do you guarantee idempotency in distributed webhook delivery?",
      intent: "Evaluating distributed systems depth and edge-case handling.",
      suggestedAnswer: "Using UUID-v7 keys with atomic SETNX deduplication in Redis with 72-hour TTL.",
    },
  ],
  reverseQuestions: [
    {
      target: "Hiring Manager",
      question: "What does success look like for this role in the first 6 months?",
      whyItMatters: "Reveals actual expectations versus generic job description bullet points.",
    },
  ],
  deRiskingGuide: [
    {
      gapOrRisk: "Candidate comes from healthcare rather than pure fintech.",
      talkingPoint: "Regulatory compliance and strict data privacy in HIPAA translate directly to PCI-DSS standards.",
    },
  ],
  outreach: {
    hiringManager: "Hi Sarah, loved your team's post on distributed ledger scaling. I recently led a similar migration at Acme and would love to share notes.",
    recruiter: "Hi Alex, noticed the Staff Engineer opening on your radar. I have 8+ years scaling high-throughput payment systems and am actively exploring roles.",
    peer: "Hey Marcus, saw your tech talk on Kafka streaming. Curious how your team handles consumer partition rebalancing at scale.",
    thankYouFollowUp: "Hi Sarah, thank you for the insightful conversation today regarding Ledgerly's webhook architecture. Excited about the opportunity to contribute.",
  },
};

describe("InterviewPrepTab", () => {
  it("renders empty state with generate callout when prep is null", () => {
    render(
      <InterviewPrepTab
        applicationId="app-1"
        interviewPrep={null}
        aiReady={true}
        company="Ledgerly"
        role="Staff Infrastructure Engineer"
      />,
    );

    expect(screen.getByText(/Interview Intelligence & Prep Pack/i)).toBeInTheDocument();
    expect(screen.getByText(/STAR Story Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/Round-by-Round Q&A/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Interview Prep/i })).toBeInTheDocument();
  });

  it("renders full interview prep pack when data is provided", () => {
    render(
      <InterviewPrepTab
        applicationId="app-1"
        interviewPrep={mockPrep}
        aiReady={true}
        company="Ledgerly"
        role="Staff Infrastructure Engineer"
      />,
    );

    // Overview & 90 Days
    expect(screen.getByText(/Strategic Overview & 90-Day Execution/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategic lead driving core payment gateway redesign/i)).toBeInTheDocument();
    expect(screen.getByText(/Days 1-30: Shadow team/i)).toBeInTheDocument();

    // STAR Story
    expect(screen.getByText("System Resilience")).toBeInTheDocument();
    expect(screen.getByText(/Checkout Engine v2/i)).toBeInTheDocument();
    expect(screen.getByText(/Achieved 99.999% uptime processing 18k TPS/i)).toBeInTheDocument();

    // Q&A
    expect(screen.getByText(/Why are you interested in this role at Ledgerly\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Tell me about a time you had to make a painful technical compromise/i)).toBeInTheDocument();
    expect(screen.getByText(/How do you guarantee idempotency in distributed webhook delivery\?/i)).toBeInTheDocument();

    // Reverse Questions
    expect(screen.getByText(/For Hiring Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/What does success look like for this role in the first 6 months\?/i)).toBeInTheDocument();

    // De-Risking
    expect(screen.getByText(/Candidate comes from healthcare rather than pure fintech/i)).toBeInTheDocument();
    expect(screen.getByText(/Regulatory compliance and strict data privacy/i)).toBeInTheDocument();

    // Outreach
    expect(screen.getByText(/Hiring Manager Cold Outreach/i)).toBeInTheDocument();
    expect(screen.getByText(/Post-Interview Thank You Note/i)).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole("button", { name: /Copy Markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
  });

  it("exports clean markdown formatted interview prep", () => {
    const md = interviewPrepToMarkdown(mockPrep);
    expect(md).toContain("# Interview Intelligence & Prep");
    expect(md).toContain("## Role Overview");
    expect(md).toContain("## First 90 Days Roadmap");
    expect(md).toContain("## STAR Story Bank");
    expect(md).toContain("System Resilience (Checkout Engine v2)");
    expect(md).toContain("## Recruiter Screen Q&A");
    expect(md).toContain("## Reverse Questions to Ask");
    expect(md).toContain("## Cold Outreach & Follow-up Templates");
    expect(md).toContain("### Hiring Manager");
  });
});
