# [YOUR PROJECT NAME]

> Editable README template. Replace every `[PLACEHOLDER]` with your own information and remove this note before publishing. The NextStep capabilities below describe the website in this repository; revise them if you change the implementation.

**Website:** [Open the website](https://nextstep-techwomenaz.pages.dev)

**Team:** [TEAM NAME]

**Hackathon:** [EVENT AND YEAR]

**Demo video:** [ADD LINK OR REMOVE THIS LINE]

## About the project

NextStep is a website that helps a nonprofit run learning and mentorship programs without keeping every follow-up in a separate document. Learners can take courses, ask for a mentor introduction, track their progress, and contact the program team. Staff can manage the content, membership plans, applications, meetings, communication, and records in one place.

[ADD TWO OR THREE SENTENCES ABOUT THE PROBLEM YOUR TEAM CHOSE AND WHY IT MATTERS. DISTINGUISH WHAT THE PARTNER TOLD YOU FROM WHAT YOU PERSONALLY VERIFIED.]

This is an independent hackathon project, not an official organizational website or an accredited education provider.

## Try it

1. Open [the website](https://nextstep-techwomenaz.pages.dev).
2. Select **Create learner account** to try the learner experience, or obtain authorized admin/mentor access from the workspace owner.
3. Complete a profile, search for a course, and work through its starting assessment, lessons, and final assessment.
4. Review the feedback and, where available, create a private follow-up course.
5. Open **Find a mentor → Find people**, review a profile, and submit an introduction request. If no match is available, send an open request to staff.

Use test information in the shared review workspace. Do not publish passwords or provider keys here.

## Main features

- **Learning:** searchable courses, saved progress, practice checks, before/after results, AI feedback, and optional private follow-up courses.
- **Mentoring:** real mentor profiles, interest-based suggestions, introduction requests, staff assignments, meeting records, and external meeting links.
- **Membership:** editable prices and benefits, enforced course/mentoring/AI access, plan previews, and PayPal Sandbox checkout.
- **Administration:** learner applications, participant records, member needs, in-app announcements, workshop results, CSV tools, and funding tracking.
- **AI tools:** a plain-chat program agent, course creation/revision, editable model settings, and encrypted server-side credentials.

The review catalog includes 12 practical study courses and seven academic introductions alongside the existing courses. These are independent study materials without college credit. [KEEP THE CURRENT COUNTS OR UPDATE THEM AFTER VERIFYING YOUR DEPLOYMENT.]

The agent proposes most changes for review: read **See exact changes**, then type **apply** or **cancel**. An explicit, unambiguous course archive request can save immediately. The agent can create mentor sign-ins, showing generated credentials once; a staff-created learner record alone does not create a learner login.

## Built with

| Part | Technology |
| --- | --- |
| Website | HTML, CSS, and JavaScript |
| Hosting and API | Cloudflare Pages and a bundled Worker/Pages Functions API |
| Database | Cloudflare D1 |
| AI | Server-side OpenAI API with an administrator-configured model |
| Test payments | PayPal Sandbox |

[ADD ANY TOOLS YOUR TEAM ACTUALLY USED. DO NOT CLAIM AN INTEGRATION JUST BECAUSE IT APPEARS IN A FUTURE PLAN.]

## Run locally

With Node.js 22 or later and npm installed, run from the repository root:

```bash
npm ci
npm run db:local
npm run dev
```

Open the URL Wrangler prints. Local data persists in `.wrangler/`; the local review database is separate from the published site. For optional secrets use ignored `.dev.vars`, never source files or browser code. See [the main README](README.md) for account setup and importing the authored curriculum.

## Check and publish

```bash
npm run check
npm test
npm run pages:build
```

The website/API suite currently has 94 passing tests. [REPLACE THIS WITH YOUR VERIFIED RESULT WHEN YOU CHANGE THE CODE.]

Create your own Cloudflare Pages project and D1 database, update `wrangler.pages.jsonc`, initialize the schema or apply the required upgrades, and configure server secrets before publishing:

```bash
npm run pages:deploy
```

Follow [the Pages deployment guide](docs/PAGES_DEPLOY.md). `npm run deploy` is a separate production Worker target and does not publish the Pages website.

## Current limits

PayPal uses test money only, with no automatic renewal, refunds, or webhook processing. A verified sandbox API connection and mocked payment tests are not a completed buyer checkout. The public Pages review blocks email/SMS delivery and has no cron sender. Meeting requests still need people to confirm availability. AI output and generated courses need review.

Before real participant onboarding, account recovery, security/accessibility review, backup/restore testing, data-retention processes, and program content review still need attention. [ADD ANY OTHER LIMITATIONS YOU FOUND.]

## Documentation

- [Full user guide](docs/USER_GUIDE.md)
- [Detailed project description](docs/APP_DESCRIPTION.md)
- [Curriculum and reading sources](docs/CURRICULUM.md)
- [Operations and configuration](docs/OPERATIONS.md)
- [Cloudflare Pages deployment](docs/PAGES_DEPLOY.md)

## Team

| Name | Contribution |
| --- | --- |
| [NAME] | [WHAT THIS PERSON WORKED ON] |
| [NAME] | [WHAT THIS PERSON WORKED ON] |
| [NAME] | [WHAT THIS PERSON WORKED ON] |

**Acknowledgments:** [MENTORS, PARTNERS, ORGANIZERS, AND SOURCES TO CREDIT]

## Next steps

- [NEXT PRIORITY]
- [NEXT PRIORITY]
- [ISSUE TRACKER LINK, IF AVAILABLE]

## License

[CHOOSE A LICENSE, ADD THE ACTUAL LICENSE FILE, AND REPLACE THIS NOTE.]
