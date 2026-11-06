import { describe, expect, it } from "vitest";

import { detectRoleArchetype } from "./archetypes";
import { analyzePostingSignals } from "./signals";

describe("Role Archetype Detection", () => {
  it("detects 0-to-1 builder roles", () => {
    const analysis = detectRoleArchetype("Founding Fullstack Engineer", "Join our early-stage startup to build the MVP from scratch.");
    expect(analysis.archetype).toBe("builder");
    expect(analysis.label).toBe("0-to-1 Builder");
  });

  it("detects scale & systems architect roles", () => {
    const analysis = detectRoleArchetype("Staff Infrastructure Engineer", "Design high-throughput distributed systems handling billions of requests via Kafka and Kubernetes.");
    expect(analysis.archetype).toBe("scaler");
    expect(analysis.label).toBe("Scale & Systems Architect");
  });

  it("detects modernization roles", () => {
    const analysis = detectRoleArchetype("Senior Backend Engineer", "Lead our core monolith refactor and migration to modern microservices to pay down technical debt.");
    expect(analysis.archetype).toBe("modernizer");
  });
});

describe("Posting Signals & Red Flags Analysis", () => {
  it("flags missing salary and burnout language", () => {
    const signals = analyzePostingSignals(
      "Fast-paced environment! We work hard play hard and you must do whatever it takes to ship on time. Stack: React, Vue, Angular, Node, Python, Go, Rust, Java, C++, Docker, K8s, Terraform, Kafka.",
      { salary: null },
    );
    expect(signals.salaryTransparentNode).toBe(false);
    expect(signals.redFlags.some((rf) => rf.includes("No salary"))).toBe(true);
    expect(signals.redFlags.some((rf) => rf.includes("Burnout hazard"))).toBe(true);
    expect(signals.redFlags.some((rf) => rf.includes("broad technology stack"))).toBe(true);
    expect(signals.clarityScore).toBe("low");
  });

  it("detects positive transparency and growth signals", () => {
    const signals = analyzePostingSignals(
      "We offer a $150k-$180k salary band, remote-first setup, annual conference budget, and generous 401(k) match.",
      { salary: "$150,000–$180,000", mode: "Remote" },
    );
    expect(signals.salaryTransparentNode).toBe(true);
    expect(signals.positives.length).toBeGreaterThanOrEqual(2);
    expect(signals.clarityScore).toBe("high");
  });
});
