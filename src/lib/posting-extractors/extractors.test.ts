import { describe, expect, it } from "vitest";

import { isAshbyUrl } from "./ashby";
import { isBambooHrUrl } from "./bamboohr";
import { extractGreenhouseParams, isGreenhouseUrl } from "./greenhouse";
import { extractIndeedJobKey, isIndeedUrl, parseIndeedHtml } from "./indeed";
import { trySpecializedExtractors } from "./index";
import { extractLeverParams, isLeverUrl } from "./lever";
import { extractLinkedInJobId, isLinkedInUrl, parseLinkedInGuestHtml } from "./linkedin";
import { isPersonioUrl } from "./personio";
import { extractSmartRecruitersParams, isSmartRecruitersUrl } from "./smartrecruiters";
import { extractWorkdayParams, isWorkdayUrl } from "./workday";

describe("LinkedIn Extractor", () => {
  it("detects LinkedIn URLs accurately", () => {
    expect(isLinkedInUrl(new URL("https://www.linkedin.com/jobs/view/4479302277"))).toBe(true);
    expect(isLinkedInUrl(new URL("https://linkedin.com/jobs/view/senior-dev-123456"))).toBe(true);
    expect(isLinkedInUrl(new URL("https://example.com/jobs/linkedin"))).toBe(false);
  });

  it("extracts job ID from various LinkedIn URL formats", () => {
    expect(extractLinkedInJobId(new URL("https://www.linkedin.com/jobs/view/4479302277"))).toBe("4479302277");
    expect(extractLinkedInJobId(new URL("https://www.linkedin.com/jobs/view/software-engineer-4479302277?refId=123"))).toBe("4479302277");
    expect(extractLinkedInJobId(new URL("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4479302277"))).toBe("4479302277");
    expect(extractLinkedInJobId(new URL("https://www.linkedin.com/jobs/search/?currentJobId=4479302277&keywords=dev"))).toBe("4479302277");
  });

  it("parses LinkedIn guest HTML", () => {
    const html = `
      <div class="topcard__flavor-row">
        <a class="topcard__org-name-link" href="#">Affirm</a>
        <span class="topcard__flavor">San Francisco, CA</span>
      </div>
      <h2 class="topcard__title">Software Engineer I</h2>
      <ul class="description__job-criteria-list">
        <li class="description__job-criteria-item">
          <h3>Seniority level</h3>
          <span>Entry level</span>
        </li>
      </ul>
      <div class="show-more-less-html__markup">
        At Affirm, we exist for the moments that matter. We are building the next generation of financial products and looking for passionate engineers to join our team in San Francisco.
      </div>
    `;

    const parsed = parseLinkedInGuestHtml(html);
    expect(parsed).not.toBeNull();
    expect(parsed?.text).toContain("Affirm: Software Engineer I");
    expect(parsed?.text).toContain("San Francisco, CA");
    expect(parsed?.text).toContain("Seniority level: Entry level");
    expect(parsed?.text).toContain("At Affirm, we exist for the moments that matter.");
  });
});

describe("Indeed Extractor", () => {
  it("detects Indeed URLs accurately across country domains", () => {
    expect(isIndeedUrl(new URL("https://www.indeed.com/viewjob?jk=abcdef0123456789"))).toBe(true);
    expect(isIndeedUrl(new URL("https://ca.indeed.com/job/software-engineer-abcdef0123456789"))).toBe(true);
    expect(isIndeedUrl(new URL("https://de.indeed.com/viewjob?jk=abcdef0123456789"))).toBe(true);
    expect(isIndeedUrl(new URL("https://google.com/indeed"))).toBe(false);
  });

  it("extracts Indeed job keys", () => {
    expect(extractIndeedJobKey(new URL("https://www.indeed.com/viewjob?jk=7240e4f243003058"))).toBe("7240e4f243003058");
    expect(extractIndeedJobKey(new URL("https://www.indeed.com/m/viewjob?id=7240e4f243003058"))).toBe("7240e4f243003058");
    expect(extractIndeedJobKey(new URL("https://www.indeed.com/job/senior-developer-7240e4f243003058"))).toBe("7240e4f243003058");
  });

  it("parses Indeed HTML with description element", () => {
    const html = `
      <h1 class="jobsearch-JobInfoHeader-title">Full Stack Engineer</h1>
      <div data-testid="inlineHeader-companyName">Stripe</div>
      <div data-testid="inlineHeader-companyLocation">Seattle, WA</div>
      <div id="jobDescriptionText">
        Stripe is a financial infrastructure platform for the internet. Millions of companies from the world's largest enterprises to the most ambitious startups use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.
      </div>
    `;

    const parsed = parseIndeedHtml(html);
    expect(parsed).not.toBeNull();
    expect(parsed?.text).toContain("Stripe: Full Stack Engineer");
    expect(parsed?.text).toContain("Seattle, WA");
    expect(parsed?.text).toContain("Stripe is a financial infrastructure platform");
  });
});

describe("Greenhouse Extractor", () => {
  it("detects Greenhouse URLs and extracts params", () => {
    const url1 = new URL("https://boards.greenhouse.io/gitlab/jobs/8638232002");
    expect(isGreenhouseUrl(url1)).toBe(true);
    expect(extractGreenhouseParams(url1)).toEqual({ company: "gitlab", id: "8638232002" });

    const url2 = new URL("https://job-boards.greenhouse.io/embed/job_app?for=figma&token=123456");
    expect(isGreenhouseUrl(url2)).toBe(true);
    expect(extractGreenhouseParams(url2)).toEqual({ company: "figma", id: "123456" });
  });
});

describe("Lever Extractor", () => {
  it("detects Lever URLs and extracts params", () => {
    const url = new URL("https://jobs.lever.co/leverdemo/4b566589-3221-4f33-8a35-0e365022e1b1");
    expect(isLeverUrl(url)).toBe(true);
    expect(extractLeverParams(url)).toEqual({ company: "leverdemo", id: "4b566589-3221-4f33-8a35-0e365022e1b1" });
  });
});

describe("Ashby Extractor", () => {
  it("detects Ashby URLs", () => {
    expect(isAshbyUrl(new URL("https://jobs.ashbyhq.com/openai/123-456"))).toBe(true);
    expect(isAshbyUrl(new URL("https://ashbyhq.com/pricing"))).toBe(false);
  });
});

describe("Workday Extractor", () => {
  it("detects Workday URLs and extracts params", () => {
    const url = new URL("https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-CA-Santa-Clara/Senior-Compiler-Engineer_JR1982345");
    expect(isWorkdayUrl(url)).toBe(true);
    expect(extractWorkdayParams(url)).toEqual({
      tenant: "nvidia",
      site: "NVIDIAExternalCareerSite",
      jobPath: "US-CA-Santa-Clara/Senior-Compiler-Engineer_JR1982345",
    });
  });
});

describe("SmartRecruiters Extractor", () => {
  it("detects SmartRecruiters URLs and extracts params", () => {
    const url = new URL("https://jobs.smartrecruiters.com/AcmeCorp/12345678-dev");
    expect(isSmartRecruitersUrl(url)).toBe(true);
    expect(extractSmartRecruitersParams(url)).toEqual({
      company: "AcmeCorp",
      id: "12345678-dev",
    });
  });
});

describe("BambooHR & Personio Extractors", () => {
  it("detects BambooHR and Personio URLs", () => {
    expect(isBambooHrUrl(new URL("https://gitlab.bamboohr.com/careers/32"))).toBe(true);
    expect(isPersonioUrl(new URL("https://acme.jobs.personio.de/job/12345"))).toBe(true);
    expect(isPersonioUrl(new URL("https://acme.jobs.personio.com/job/12345"))).toBe(true);
  });
});

describe("trySpecializedExtractors routing", () => {
  it("returns null for non-specialized links", async () => {
    const result = await trySpecializedExtractors(new URL("https://mycompany.example.com/careers/1"));
    expect(result).toBeNull();
  });
});
