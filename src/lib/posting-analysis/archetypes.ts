// Career-Ops Role Archetypes
// Categorizes roles based on stage, scope, and technical expectations.

export type RoleArchetype = "builder" | "scaler" | "modernizer" | "specialist" | "lead";

export type ArchetypeAnalysis = {
  archetype: RoleArchetype;
  label: string;
  tagline: string;
  signals: string[];
};

const ARCHETYPE_PATTERNS: Record<RoleArchetype, { label: string; tagline: string; keywords: RegExp[] }> = {
  builder: {
    label: "0-to-1 Builder",
    tagline: "High autonomy, rapid prototyping, greenfield features, entrepreneurial execution.",
    keywords: [
      /\b(founding|greenfield|0-to-1|zero to one|mvp|prototype|fast-paced|startup|seed|early stage|first engineer|wear many hats)\b/i,
      /\b(build from scratch|ground up|rapid iteration|scrappy)\b/i,
    ],
  },
  scaler: {
    label: "Scale & Systems Architect",
    tagline: "High-throughput services, distributed systems, platform infrastructure, resilience.",
    keywords: [
      /\b(distributed systems|high scale|scale|millions of users|billions of requests|latency|throughput|microservices|infrastructure|reliability|sre|platform)\b/i,
      /\b(kafka|kubernetes|terraform|cloud infrastructure|observability|fault-tolerant)\b/i,
    ],
  },
  modernizer: {
    label: "Modernization & Refactor",
    tagline: "Technical debt remediation, framework migrations, system decoupling, legacy evolution.",
    keywords: [
      /\b(moderniz(e|ation)|refactor|rewrite|migrate|migration|decouple|legacy|monolith|technical debt|upgrade)\b/i,
    ],
  },
  specialist: {
    label: "Deep Domain Specialist",
    tagline: "Focused depth in algorithms, AI/ML, security, compilers, graphics, or hardware.",
    keywords: [
      /\b(compiler|dsp|audio|video|graphics|wgpu|vulkan|metal|cryptograph|security|kernel|embedded|firmware|llm|deep learning|computer vision)\b/i,
      /\b(phd|research|patents|specialized domain)\b/i,
    ],
  },
  lead: {
    label: "Technical & Team Lead",
    tagline: "Roadmap ownership, cross-team coordination, architecture governance, mentoring.",
    keywords: [
      /\b(staff|principal|lead|head of|director|vp|manager|mentorship|mentor|hiring|roadmap|stakeholder|cross-functional)\b/i,
    ],
  },
};

export function detectRoleArchetype(titleOrPosting: string, maybePosting?: string): ArchetypeAnalysis {
  const [title, postingText] = maybePosting !== undefined ? [titleOrPosting, maybePosting] : ["", titleOrPosting];
  const combined = `${title}\n${postingText}`;
  const scores: Record<RoleArchetype, number> = {
    builder: 0,
    scaler: 0,
    modernizer: 0,
    specialist: 0,
    lead: 0,
  };

  const matchedSignals: Record<RoleArchetype, string[]> = {
    builder: [],
    scaler: [],
    modernizer: [],
    specialist: [],
    lead: [],
  };

  for (const [key, config] of Object.entries(ARCHETYPE_PATTERNS) as [RoleArchetype, (typeof ARCHETYPE_PATTERNS)[RoleArchetype]][]) {
    for (const pattern of config.keywords) {
      const globalRegex = new RegExp(pattern.source, "gi");
      const matches = combined.match(globalRegex) ?? [];
      if (matches.length > 0) {
        scores[key] += matches.length * 2;
        matchedSignals[key].push(...matches);
      }
    }
  }

  // Weight title matches heavily
  for (const [key, config] of Object.entries(ARCHETYPE_PATTERNS) as [RoleArchetype, (typeof ARCHETYPE_PATTERNS)[RoleArchetype]][]) {
    for (const pattern of config.keywords) {
      if (pattern.test(title)) {
        scores[key] += 5;
      }
    }
  }

  let bestArchetype: RoleArchetype = "builder";
  let maxScore = -1;

  for (const [key, score] of Object.entries(scores) as [RoleArchetype, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestArchetype = key;
    }
  }

  const def = ARCHETYPE_PATTERNS[bestArchetype];
  return {
    archetype: bestArchetype,
    label: def.label,
    tagline: def.tagline,
    signals: [...new Set(matchedSignals[bestArchetype])],
  };
}
