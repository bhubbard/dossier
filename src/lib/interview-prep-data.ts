import { z } from "zod";

export const starStorySchema = z.object({
  competency: z.string(),
  project: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
});
export type StarStory = z.infer<typeof starStorySchema>;

export const interviewQuestionSchema = z.object({
  question: z.string(),
  intent: z.string(),
  suggestedAnswer: z.string(),
});
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const reverseQuestionSchema = z.object({
  target: z.string(),
  question: z.string(),
  whyItMatters: z.string(),
});
export type ReverseQuestion = z.infer<typeof reverseQuestionSchema>;

export const deRiskItemSchema = z.object({
  gapOrRisk: z.string(),
  talkingPoint: z.string(),
});
export type DeRiskItem = z.infer<typeof deRiskItemSchema>;

export const outreachTemplatesSchema = z.object({
  hiringManager: z.string(),
  recruiter: z.string(),
  peer: z.string(),
  thankYouFollowUp: z.string(),
});
export type OutreachTemplates = z.infer<typeof outreachTemplatesSchema>;

export const interviewPrepSchema = z.object({
  roleOverview: z.string(),
  first90Days: z.string(),
  starStories: z.array(starStorySchema),
  recruiterQuestions: z.array(interviewQuestionSchema),
  hiringManagerQuestions: z.array(interviewQuestionSchema),
  technicalQuestions: z.array(interviewQuestionSchema),
  reverseQuestions: z.array(reverseQuestionSchema),
  deRiskingGuide: z.array(deRiskItemSchema),
  outreach: outreachTemplatesSchema,
});
export type InterviewPrep = z.infer<typeof interviewPrepSchema>;

export function interviewPrepToMarkdown(prep: InterviewPrep): string {
  const parts: string[] = [];
  parts.push("# Interview Intelligence & Prep\n");
  parts.push("## Role Overview\n" + prep.roleOverview + "\n");
  parts.push("## First 90 Days Roadmap\n" + prep.first90Days + "\n");

  if (prep.starStories.length > 0) {
    parts.push("## STAR Story Bank\n");
    for (const story of prep.starStories) {
      parts.push(`### ${story.competency} (${story.project})`);
      parts.push(`- **Situation:** ${story.situation}`);
      parts.push(`- **Task:** ${story.task}`);
      parts.push(`- **Action:** ${story.action}`);
      parts.push(`- **Result:** ${story.result}\n`);
    }
  }

  if (prep.recruiterQuestions.length > 0) {
    parts.push("## Recruiter Screen Q&A\n");
    for (const q of prep.recruiterQuestions) {
      parts.push(`### Q: ${q.question}`);
      parts.push(`*Intent:* ${q.intent}`);
      parts.push(`*Talking Points:* ${q.suggestedAnswer}\n`);
    }
  }

  if (prep.hiringManagerQuestions.length > 0) {
    parts.push("## Hiring Manager Deep-Dive Q&A\n");
    for (const q of prep.hiringManagerQuestions) {
      parts.push(`### Q: ${q.question}`);
      parts.push(`*Intent:* ${q.intent}`);
      parts.push(`*Talking Points:* ${q.suggestedAnswer}\n`);
    }
  }

  if (prep.technicalQuestions.length > 0) {
    parts.push("## Technical & Domain Panel Q&A\n");
    for (const q of prep.technicalQuestions) {
      parts.push(`### Q: ${q.question}`);
      parts.push(`*Intent:* ${q.intent}`);
      parts.push(`*Talking Points:* ${q.suggestedAnswer}\n`);
    }
  }

  if (prep.reverseQuestions.length > 0) {
    parts.push("## Reverse Questions to Ask\n");
    for (const rq of prep.reverseQuestions) {
      parts.push(`### For ${rq.target}: "${rq.question}"`);
      parts.push(`*Signal:* ${rq.whyItMatters}\n`);
    }
  }

  if (prep.deRiskingGuide.length > 0) {
    parts.push("## De-Risking Talking Points\n");
    for (const dr of prep.deRiskingGuide) {
      parts.push(`### Risk / Gap: ${dr.gapOrRisk}`);
      parts.push(`*Strategy:* ${dr.talkingPoint}\n`);
    }
  }

  parts.push("## Cold Outreach & Follow-up Templates\n");
  parts.push(`### Hiring Manager\n${prep.outreach.hiringManager}\n`);
  parts.push(`### Recruiter\n${prep.outreach.recruiter}\n`);
  parts.push(`### Peer\n${prep.outreach.peer}\n`);
  parts.push(`### Post-Interview Thank You Note\n${prep.outreach.thankYouFollowUp}\n`);

  return parts.join("\n");
}
