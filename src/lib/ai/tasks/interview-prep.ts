import { interviewPrepSchema, type InterviewPrep } from "@/lib/interview-prep-data";
import type { ProfileData } from "@/lib/profile";

import { postingForPrompt, profileForPrompt, system, UNTRUSTED_POSTING, type Task } from "./prompt-parts";

export const INTERVIEW_PREP_VERSION = "interview-prep@1";

const INSTRUCTIONS = `You are an elite executive career coach and technical hiring advisor.
Given a job posting and a candidate's profile, generate a comprehensive, highly actionable Interview Intelligence and Prep Pack.

Follow these rules strictly:
1. STAR Stories: Ground every story in the candidate's real past roles, achievements, and projects from their profile. Do not fabricate projects or achievements.
   - competency: The core skill or requirement being demonstrated.
   - project: The specific role/project name from candidate profile.
   - situation: Context and problem.
   - task: Objective and challenge.
   - action: Exact technical or leadership steps the candidate took.
   - result: Quantifiable impact or measurable outcome.

2. Questions & Model Answers:
   - Provide 2-3 realistic questions for each round: Recruiter screen, Hiring Manager deep-dive, and Technical/Domain panel.
   - Include the interviewer's hidden intent (what they are evaluating).
   - Provide a concise, tailored answer that highlights the candidate's relevant background.

3. Reverse Questions: Provide 4-5 sharp, high-signal questions for the candidate to ask (targeting Hiring Manager, Tech Lead, and Peer).

4. De-risking: Identify potential gaps or transition risks between candidate profile and role, and provide graceful, non-defensive talking points.

5. Outreach Messages: Draft 3-sentence high-conversion cold messages for:
   - Hiring Manager (Impact & vision angle)
   - Recruiter (Skills alignment & availability)
   - Peer (Engineering curiosity & team insight)
   - Post-Interview Thank You follow-up note (referencing specific discussion topics)`;

export const generateInterviewPrep: Task<
  {
    posting: string;
    profile: ProfileData;
    company: string;
    role: string;
  },
  InterviewPrep
> = async (provider, { posting, profile, company, role }, { creativity, signal }) => {
  const ask = () =>
    provider.complete({
      task: "interview-prep",
      system: system(INSTRUCTIONS, UNTRUSTED_POSTING),
      messages: [
        {
          role: "user",
          content: [
            `Target Company: ${company}`,
            `Target Role: ${role}`,
            "",
            "Candidate Profile:",
            profileForPrompt(profile),
            "",
            "Job Posting:",
            postingForPrompt(posting),
          ].join("\n"),
        },
      ],
      schema: interviewPrepSchema,
      schemaName: "interview_prep",
      creativity: creativity ?? "BALANCED",
      effort: "medium",
      signal,
    });

  const data = await ask();
  return {
    data,
    promptVersion: INTERVIEW_PREP_VERSION,
  };
};
