# NextStep

NextStep is a website for running a learning and mentorship program. Learners can take courses, find people with relevant experience, ask for support, and see their progress. Program staff can manage the courses, memberships, applications, meetings, messages, and results from the same workspace.

The idea came from a straightforward problem: a small nonprofit has more people to support than available mentor hours, while information and follow-ups are spread across documents. NextStep gives people something useful to do between meetings and gives staff a clearer view of who needs help.

This is an independent hackathon project built around the TechWomenAZ use case. It is not the organization's official website, an accredited college, or a claim that a production security review has been completed.

**[Open the website](https://nextstep-techwomenaz.pages.dev)** · **[Full user guide](docs/USER_GUIDE.md)** · **[Side-by-side testing guide](docs/TESTING.md)** · **[Website slideshow](docs/NextStep-Website-Guide.pptx)** · **[Detailed project description](docs/APP_DESCRIPTION.md)** · **[Editable README template](README.sample.md)**

## What you can do

| For learners | For program staff |
| --- | --- |
| Create an account and submit a program application | Review applications and respond to member needs |
| Record goals, interests, experience, and availability | Keep participant and mentor records together |
| Search courses and continue saved learning | Generate and edit courses with AI or ordinary forms |
| Compare starting and final assessment results | Review course progress and recorded program results |
| Get feedback and optional private follow-up practice | Edit membership prices, benefits, and access rules |
| Request a mentor introduction or course discussion | Coordinate mentor assignments and meetings |
| Read announcements and compare membership plans | Track announcements, communication drafts, and funding |
| Ask the learning assistant for help | Ask the program agent to prepare and apply supported changes |

The live review catalog has **23 courses**: four existing courses, 12 practical study courses, and seven academic introductions. The 19 authored additions contain 104 lessons, 246 assessment/practice questions, projects, mentor discussion prompts, and linked reading sources. They do not contain fabricated participant outcomes or pretend mentor assignments.

The academic subjects are forensic science, psychology, statistics, research methods, biology, chemistry, and criminal justice. They are college-style independent study introductions; completing them does not award college credit. See [the curriculum guide](docs/CURRICULUM.md) for the subjects, prerequisites, projects, and sources.

## Getting into the website

Open [NextStep](https://nextstep-techwomenaz.pages.dev) in a browser. It works on desktop and phone screens; no installation is needed.

- **Learners:** choose **Create learner account**, enter your details, and sign in with the username you chose. A username is not necessarily an email address.
- **Administrators:** use the account supplied by the workspace owner. There is no public administrator signup.
- **Mentors:** use the login created for you by program staff. A mentor profile alone is not a sign-in account.

The role controls the workspace you see. A membership plan controls learner benefits; buying or receiving a plan never makes someone an administrator or mentor. On a small screen, open the navigation menu to switch pages.

The public URL is a shared review workspace. Use test information when reviewing it, and obtain administrator access privately from the owner. Passwords and provider keys do not belong in this README.

If a saved form asks you to sign in again, the session may have expired. The website can ask for the same account’s password while keeping the draft, then retry that request once. Canceling recovery leaves the draft in the tab. Use Sign out when finished on a shared device.

## A learner's first visit

### 1. Complete your profile and application

Open **My profile** and add a goal, career stage, interests, and availability. You can also add your story, résumé highlights, and optional coursework or grades. Résumé information is entered as text. The profile has 12 career stages, from exploring technology and studying through career changes, specialist roles, leadership, and entrepreneurship.

Open **Applications** and choose **Start learner application**. Enter your goals and interests, then add any experience, availability, or support needs you want staff to consider. Submit it and return to this page for its status and the team's response. A request for follow-up can be answered by editing and resubmitting. An application decision does not automatically change your plan or account permissions.

### 2. Find a course and work through it

Open **Learn** and use **Search courses** to look for a subject, title, or skill. A locked course card means your plan does not include starting that course; it opens Membership plans so you can review your options. Lessons and assessments remain protected by the server, not just hidden by the interface.

Start an included course, complete its starting assessment and confidence check-in, then work through the lessons and practice questions. Progress is saved so you can return later. Courses include examples, activities, and further reading. The course guide can explain the material; the interface tells you whether the answer comes from live AI or prepared guidance.

Finish the lessons and take the final assessment. The results show the recorded starting and final scores, confidence check-ins, and the answers that need more practice. With AI configured and included in your access, the learning review explains what to work on using the questions you actually missed. If AI is unavailable, the course's own answer explanations remain available.

Where offered, choose **Create my personalized course** for a private, three-lesson follow-up with new examples and practice. It appears in your learning library rather than the public catalog. For older completions that lack saved answer details, **Take a practice check** supplies feedback evidence without rewriting the original completion score.

### 3. Request a connection

Open **Find a mentor → Find people**. Suggestions use real profiles in the program, with shared interests, experience, availability, and questions to clarify. AI can help explain the fit; shared-topic matching is available as a fallback. Profiles without a confirmed match are labeled accordingly.

Select **Request an introduction**, review the topic, and send it to staff. If there is no suitable person, send an open staff matching request. The saved request appears in **Your connections**. A course also offers **Request a course mentor** for its project or topic.

A suggestion is not an appointment. Staff still assign a real mentor and confirm the time. Meetings can record one-time, weekly, fortnightly, or monthly cadence, last/next meetings, and a shared HTTPS video-room link. **Join meeting** opens that external service; NextStep does not host video calls or create calendar invitations.

### 4. Stay in touch

Use **Messages** for program announcements and read acknowledgments. Use **Get help → Share a need** to tell staff what is getting in the way, then return to read their response and the request's status. The learner assistant can suggest useful next steps, but does not make administrative changes or book meetings on your behalf.

## Membership plans and test checkout

Learners open **Membership plans** to compare the current offers. The starter names are Community, Guided, and Supporter; staff can rename or replace their details.

Administrators choose **Add plan** or **Edit plan** to change the name, description, benefit list, price, currency, billing period, active status, and default for new learners. Under **What members can use**, choose all published courses, selected courses, or no new courses; mentoring requests and AI help have their own switches. For a selected catalog, search and check the included courses. Benefit text describes the offer; these access controls enforce it.

Save, then choose **Try this plan as a learner** to check what it unlocks. Staff can assign plans directly from the assignment area or a learner's record. Archiving a plan stops new assignments while preserving existing ones. Courses already started and existing meetings remain available after access changes. Applications, profile editing, messages, and support requests remain available to learners on every plan.

Paid plan cards offer **Buy [plan]**. Review the price and benefits, continue to **PayPal Sandbox**, and use a sandbox buyer account. On return, the server checks the order owner, amount, currency, and completed capture before upgrading access. If interrupted, return to Membership plans and choose **Check payment and upgrade**. A pending, canceled, or failed payment does not grant an upgrade.

This is test checkout with no real-money charges. Monthly purchases grant 30 days and yearly purchases 365 days; one-time purchases have no time expiry. There is no automatic renewal. Expired timed purchases return to the default plan. Checkout supports USD, CAD, EUR, GBP, and AUD; INR can be recorded on manually assigned plans but is not supported by this checkout.

## Running the program as an administrator

### People, applications, and mentor logins

Open **Learners** to add or edit participant records, cohorts, contact preferences, stages, and plan assignments. **Adding a learner record does not create a usable login.** People who need a learner sign-in should use self-registration. There is no automatic invitation or record-claiming flow that merges a separate staff-created record with a new account.

Open **Applications** to review a submission, choose its status, and write a response. That response is visible to the applicant. **Member needs** works similarly for ongoing support: acknowledge the request, record a useful response, and track open, in-progress, or resolved status.

For mentors, either add the profile in **Mentors** and use **Create mentor login**, or ask the agent: “Create a mentor profile and sign-in for [name].” The agent can start from a name, leaving unprovided professional details pending. Review its proposal and type **apply**. Save the generated username and temporary password when they appear; the password is shown once and excluded from saved chat history and future AI context. Share credentials through your own approved channel.

New agent-created mentor accounts start unverified with zero capacity. Staff review the person's experience and set availability/capacity before assigning learners. Mentors can sign in to complete their own profile and manage their assigned sessions. Their workspace does not expose program-wide records, learner grades, contact details, application answers, or funding.

### Create, edit, and preview courses

Open **Courses** and start a course draft. Describe the audience, subject, and what learners should be able to do; the AI builder creates lessons and assessments using the configured provider. A generated draft needs review and is not automatically published.

Use the ordinary editor to change titles, instructions, examples, questions, answer choices, correct answers, and explanations. **Edit with AI → Revise draft with AI** accepts a request such as “Add a worked example and make the final question harder.” Review the result before saving; **Undo AI edit** restores the previous draft. No JSON editing is needed.

Choose **Try as a learner** to practice the draft, then save and publish when ready. Course and plan previews are temporary: they do not create real learners, results, requests, or payments. A course draft preview can show material regardless of plan access; use the plan preview to verify the actual locks. Existing enrollments retain their saved course version when staff edit a course, and archiving does not erase their progress.

### Use the AI program agent

Click the floating **Ask NextStep** button or open **AI agent**. Type what you want in the chatbox. Responses can use headings, bold text, lists, code, and comparison tables.

For most changes, the agent prepares a proposal. Expand **See exact changes**, check the affected records, and type **apply** to save or **cancel** to discard. You can also explain what to adjust. Direct, unambiguous course archive requests save immediately; the response says what happened. Check the reported outcome rather than assuming a proposal was applied.

The agent supports courses, plans, participant records, mentor profiles/logins, existing meeting requests, staff-specified application responses, member needs, in-app announcements, events, resources, manual results, funding records, and basic program settings. Examples:

- “Show the membership plans in a table with price and included benefits.”
- “Draft a beginner course about preparing for a first technology interview.”
- “Create a mentor profile and sign-in for [name].”
- “Change [plan] to include only [named courses], with AI help enabled.”

Its actions run through the same server validation as the normal forms. It cannot change existing passwords or API keys, grant arbitrary roles, alter actual learner assessment results, send external messages, take payments, delete records, or deploy software. It can execute several supported changes, but a multi-action request is not one all-or-nothing transaction: if a step fails, review which earlier steps succeeded before asking again. Errors do not silently retry writes.

### Communications, results, and funding

Use **Messages** to publish in-app announcements for everyone or a cohort and see read acknowledgments. The web communication tools also prepare reminders, group announcements, and individual follow-ups for reviewed email/SMS drafts, with contact consent checks and queue states. **The public Pages review does not send email or SMS and has no scheduled sender.** A draft or queued record is not proof of delivery.

Use **Results** to review course comparisons, filter by cohort or career stage, enter workshop records, import/export supported CSV records, and print an impact snapshot. Download the CSV template and preview an import first. Importing the same file again can create duplicates; this is a manual migration tool, not a live Google Docs integration.

Assessment change is final minus starting score in **percentage points**: 40% to 70% is +30 points. Only completed pairs belong in that average, and confidence is a separate self-reported measure. Workshop results are separate from course results. These figures describe recorded learning activity; they do not prove that the program caused a career outcome.

Use **Funding** to track prospects, applications, commitments, receipts, deadlines, and notes. Keep requested, committed, and received amounts distinct. Recording a funding opportunity does not submit an application, receive a donation, or move money.

## AI and payment settings

An administrator opens **Settings** to choose the exact OpenAI API model identifier and save or replace an API key. Use a model available to that API account. A consumer chat subscription does not supply an API key. Leaving the key blank preserves the saved value; the interface reports the configured source. Course generation and the program agent need a working provider; prepared learning guidance still works without one. A saved configuration does not prove that the API account has billing or model access, so test a request after changing it.

The browser sends AI requests to the NextStep backend. Saved keys are encrypted in D1 using the server's `AI_SETTINGS_KEY`, and responses never return the saved key. The agent receives the typed request and a limited program index, excluding private contacts, grades, stories, application answers, and support summaries. Information typed directly into a request is still sent to the provider. Matching uses interests and relevant profile fields rather than grades or private stories.

In **Settings → PayPal**, enter the sandbox Client ID and Secret and choose **Save and test PayPal connection**. The server checks the credentials and stores them encrypted. This implementation only connects to sandbox payments. OAuth connection checks passed, and payment completion behavior is covered by mocked-provider/database tests; a completed sandbox buyer transaction has not been claimed as verified.

## Run the website locally

Use Node.js 22 or later, npm, and the Wrangler version pinned in the lockfile. From the repository root:

```bash
npm ci
npm run db:local
npm run dev
```

Open the local URL printed by Wrangler, normally `http://localhost:8787`. Local D1 data persists in `.wrangler/`. The local review seed defines its administrator in `src/index.ts`; it is not a production account. Use learner registration for a separate learner session. The first request initializes starter courses and settings, with fictional participants and activity disabled by default.

A fresh local database does not automatically contain all edits made to the public review database. To import the 19 authored courses, provide `NEXTSTEP_URL`, `NEXTSTEP_ADMIN_USERNAME`, and `NEXTSTEP_ADMIN_PASSWORD` in your local environment, then run:

```bash
node scripts/import-curriculum.mjs
```

The importer creates missing course IDs and preserves existing ones, including staff edits. Do not commit the environment values. For local optional secrets, use the ignored `.dev.vars` file; never put secrets in `public/` or Wrangler `vars`.

## Cloudflare architecture and deployment

The live website uses **Cloudflare Pages**, a bundled **Pages Functions/Worker API**, and **Cloudflare D1**. Pages serves the browser files; `/api/*` handles authentication, permissions, data, and provider calls; D1 stores the program records and progress. The website is not backed by Firebase.

`wrangler.pages.jsonc` describes the current review project and its dedicated D1 binding. When deploying your own instance, replace the project name, database name, and database ID with resources you own. Do not reuse the current database accidentally.

After Cloudflare login and permission setup, a fresh instance follows this sequence. Replace the uppercase names before running the commands:

```bash
npx wrangler login
npx wrangler whoami
npx wrangler d1 create YOUR_D1_DATABASE
npx wrangler pages project create YOUR_PAGES_PROJECT --production-branch main --force
```

Update `wrangler.pages.jsonc`, then initialize the **fresh** database and build the Pages package:

```bash
npx wrangler d1 execute YOUR_D1_DATABASE --config wrangler.pages.jsonc --remote --file migrations/schema.sql
npm run pages:build
npx wrangler pages secret put AI_SETTINGS_KEY --project-name YOUR_PAGES_PROJECT --cwd dist/pages-config
npm run pages:deploy
```

Supply a securely generated 64-character hexadecimal encryption secret at the prompt and retain a protected backup. Keep it stable: replacing it does not re-encrypt saved AI or PayPal credentials. Set provider credentials through the admin settings after deployment, or use supported server secret bindings. The build creates static assets in `dist/pages` and CLI configuration in `dist/pages-config`; it does not copy local secret files or databases.

For an **existing database**, back it up and apply only missing migrations in order. Fresh `schema.sql` already includes them.

| Migration | Purpose |
| --- | --- |
| `0002_mentor_accounts.sql` | Upgrade an old two-role database; run before the application migration only when needed |
| `0003_applications.sql` | Learner surveys and staff review |
| `0004_course_snapshots.sql` | Preserve enrolled course versions |
| `0005_personal_learning.sql` | Answer evidence, learning reviews, and private courses |
| `0006_paypal_sandbox.sql` | Test checkout orders and verified capture records |

Use the same `wrangler d1 execute` command with the relevant migration path. Do not apply the legacy mentor rebuild blindly to an already upgraded database. See [the Pages runbook](docs/PAGES_DEPLOY.md) for exact upgrade and local Pages commands.

The review configuration uses `DEMO_MODE=true` and `SEED_DEMO_DATA=false`. Its database is separate from local development. A separate production Worker configuration exists in `wrangler.jsonc`, but is not the published website: `npm run deploy` targets that environment, not Pages. Production requires its own D1 binding, an `ADMIN_PASSWORD` secret for first initialization, and provider/operational setup. Use [the operations guide](docs/OPERATIONS.md) before changing deployment mode. Changing a bootstrap secret later does not reset an existing account password.

## Checks and project layout

```bash
npm run check
npm test
npm run pages:build
```

The current website/API suite has **94 passing tests**. Coverage includes roles, sessions, course versions, access locks, assessment feedback, private course ownership, matching, introduction requests, agent actions, credential isolation, safe Markdown, and sandbox payment validation. Provider responses in payment and other integration tests are mocked; these tests do not spend money or deliver messages.

```text
src/                     TypeScript API, authentication, AI, matching, and payments
public/                  Responsive website, assistant UI, and styles
curriculum/              Versioned study-course content and reading sources
migrations/              Fresh D1 schema and ordered upgrades
scripts/                 Pages packaging and curriculum import
tests/                   Website/API and integration tests
wrangler.pages.jsonc     Published Pages target and D1 binding
wrangler.jsonc           Local development and separate production Worker target
docs/USER_GUIDE.md        Detailed role-by-role instructions
docs/APP_DESCRIPTION.md  Reusable project description and demonstration flow
docs/OPERATIONS.md       Configuration, data handling, and launch limitations
```

## What still needs work

NextStep is a working review build, with useful workflows and tested permission boundaries. Real participant onboarding still needs account recovery/MFA decisions, identity and mentor verification, backup/restore testing, retention policies, a full accessibility/security review, and staff review of course content.

Payments remain sandbox-only; recurring billing, webhooks, refunds, and real-money reconciliation are not implemented. External communication is disabled on the Pages review. Meeting availability is coordinated by people rather than a conflict-checking calendar. The AI agent has a defined action set and can make mistakes in a proposed change, so staff should review its output.

For a full walkthrough, use [the user guide](docs/USER_GUIDE.md). For a hackathon explanation or demonstration, start with [the project description](docs/APP_DESCRIPTION.md).
