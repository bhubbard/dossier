// Career-Ops Posting Quality & Red Flags Analyzer

export type PostingSignals = {
  clarityScore: "high" | "medium" | "low";
  redFlags: string[];
  positives: string[];
  salaryTransparentNode: boolean;
  remoteRealistic: boolean;
};

export function analyzePostingSignals(
  postingText: string,
  meta: {
    salary?: string | null;
    mode?: string | null;
    postedAt?: string | null;
  } = {},
): PostingSignals {
  const redFlags: string[] = [];
  const positives: string[] = [];

  const lower = postingText.toLowerCase();

  // 1. Pay Transparency
  const hasSalaryInMeta = Boolean(meta.salary && /\d/.test(meta.salary));
  const hasSalaryInText = /\$[\d,]+|\b\d{2,3}k\b|€[\d,]+|£[\d,]+|\b(salary|compensation|pay range)\b/i.test(postingText);
  const salaryTransparentNode = hasSalaryInMeta || hasSalaryInText;

  if (salaryTransparentNode) {
    positives.push("Transparent compensation range disclosed");
  } else {
    redFlags.push("No salary or compensation range provided");
  }

  // 2. Remote Reality Check
  const modeIsRemote = meta.mode ? /remote/i.test(meta.mode) : false;
  const mentionsRemote = /remote|work from home|telecommute/i.test(postingText);
  const mentionsOnsiteRequirement = /must reside within|commute to the office|hybrid requirement|days in office|in-person attendance|must be located near/i.test(postingText);

  let remoteRealistic = true;
  if ((modeIsRemote || mentionsRemote) && mentionsOnsiteRequirement) {
    redFlags.push("Possible remote trap: labeled remote but requires office proximity/commute");
    remoteRealistic = false;
  } else if (modeIsRemote || mentionsRemote) {
    positives.push("Explicit flexible/remote arrangement");
  }

  // 3. Scope Overload / Unicorn Check
  const techKeywords = [
    "react", "vue", "angular", "node", "python", "go", "golang", "rust", "java", "c++", "c#",
    "kubernetes", "docker", "terraform", "aws", "gcp", "azure", "graphql", "sql", "postgres",
    "kafka", "spark", "hadoop", "figma", "ci/cd", "devops", "machine learning", "pytorch",
  ];
  const mentionedTechCount = techKeywords.filter((tech) => lower.includes(tech)).length;

  if (mentionedTechCount >= 10) {
    redFlags.push(`Unusually broad technology stack (${mentionedTechCount}+ technologies listed)`);
  }

  // 4. Urgency / Culture Warnings
  if (/fast-paced environment|work hard play hard|must wear all hats|do whatever it takes|high stress|24\/7/i.test(postingText)) {
    redFlags.push("Burnout hazard phrasing ('work hard play hard', 'do whatever it takes')");
  }

  // 5. Positive Cultural Signals
  if (/learning budget|conference budget|education stipend|mentorship|work-life balance|parental leave|401\(?k\)? match|wellness/i.test(postingText)) {
    positives.push("Mentorship, growth stipend, or wellness benefits highlighted");
  }

  // 6. Clarity Score
  let clarityScore: "high" | "medium" | "low" = "medium";
  if (redFlags.length === 0 && positives.length >= 2) {
    clarityScore = "high";
  } else if (redFlags.length >= 2) {
    clarityScore = "low";
  }

  return {
    clarityScore,
    redFlags,
    positives,
    salaryTransparentNode,
    remoteRealistic,
  };
}

export const analyzeQualitySignals = analyzePostingSignals;
