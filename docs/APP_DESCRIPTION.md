# NextStep: learning and mentorship in one workspace

**Website:** [nextstep-techwomenaz.pages.dev](https://nextstep-techwomenaz.pages.dev)

**How to use it:** [User guide](USER_GUIDE.md)

**Code and setup:** [README](../README.md)

## Short description

NextStep is a website for nonprofit learning and mentorship programs. It combines self-paced courses, mentor introductions, membership plans, learner applications, communication, and progress records. Learners have a clear place to find their next step; administrators have a practical way to support them without rebuilding the program around scattered documents.

An AI assistant helps learners understand course material and helps staff prepare supported changes through ordinary chat. Staff can describe a course, review its generated lessons, edit it without JSON, try it as a learner, and publish it. The website runs on Cloudflare Pages with a server-side API and Cloudflare D1 database.

## The problem it addresses

The project brief described a nonprofit with limited mentor availability, limited funding, awkward software, and results kept in documents. It also described members whose needs were getting missed, inconsistent communication, and difficulty seeing who was matched with whom and how often they met.

Those problems are connected. If a mentor is unavailable, a learner needs a useful way to keep going. If the learner gets stuck, staff need to see the request and follow up. If a program seeks funding, staff need clear records of participation and learning, rather than trying to reconstruct everything at the end.

NextStep connects those steps in one program workspace. It is an independent hackathon project built for this use case, not an official TechWomenAZ service. The reported organizational pain points are the starting brief, not claims of an independent audit of the organization.

## The learner experience

A learner creates an account, sets a career goal, and adds interests and availability. The profile also accepts relevant experience, a personal story, résumé highlights, and optional coursework information. Twelve career-stage choices make room for people exploring technology, entering their first role, changing careers, returning to work, developing expertise, or moving into leadership.

The application survey gathers goals, interests, experience, availability, and support needs. Staff can review the application and send a response that remains visible in the learner's account. Applying, receiving a membership plan, and having a login are separate steps, so the system does not silently interpret an application decision as a purchase or permission change.

The course library is searchable by title, subject, and skills. A learner sees which courses their plan includes and which are locked. Starting a course records a baseline assessment and confidence check-in. Lessons mix explanation, worked examples, practical activities, and questions, followed by a final assessment. Progress is saved so learning can happen over several visits.

At completion, the learning review connects feedback to actual missed answers. AI can explain the concepts that deserve more attention and suggest practice. It does not invent a weakness when every answer is correct or change the recorded score. Course explanations provide a fallback if AI is unavailable. A learner can choose to create a private follow-up course with new examples and exercises based on the material they missed.

The public review catalog currently contains 23 courses. Twelve new practical courses cover areas such as AI literacy, prompting, spreadsheets, Python, web foundations, cybersecurity, accessibility, career planning, portfolios, interviews, GitHub, and teamwork. Seven academic introductions cover forensic science, psychology, statistics, research methods, biology, chemistry, and criminal justice. The authored additions include 104 lessons, 246 questions, projects, and linked primary reading sources. They are independent study introductions, not accredited programs or college credits.

## Mentorship built around real people

The mentoring flow begins with people and their experience. **Find people** searches mentor profiles that actually exist in the program. It shows shared-interest evidence and relevant experience, with availability and questions to discuss. AI can explain a suggested fit, while a shared-topic fallback keeps the workflow usable without a provider. Profiles with no confirmed common-interest match are labeled rather than presented as a certain recommendation.

A learner selects a person and requests an introduction. If nobody fits, they can ask staff to find a suitable mentor. Courses offer an open mentor request tied to their project or subject. None of these flows invents a professional, creates a pretend appointment, or promises that a particular mentor is available.

Staff review the request, assign a mentor, and confirm the meeting. Records can include cadence, last and next meetings, notes, and an external HTTPS meeting link. Mentor accounts show the mentor's own profile and assigned mentees/sessions. They do not expose private grades, contacts, application answers, or the organization's funding records.

Matching supports a conversation; it does not replace staff judgment, professional verification, or availability checks. Video meetings open an external service, and the website does not issue calendar invitations or automatically detect scheduling conflicts.

## Membership that staff can actually manage

Membership is a set of editable offers rather than fixed labels in the code. Community, Guided, and Supporter are starter plans. Administrators can change the names, descriptions, prices, currencies, periods, and benefit lists; choose a default; assign learners; and archive plans without deleting existing membership history.

Access rules sit alongside the benefit description. Staff can include all courses, choose specific courses, or allow no new courses, and independently enable mentoring requests and AI help. A searchable course picker makes selected-course plans manageable. The administrator can preview a plan as a learner to check what is available before assigning it.

Paid plans support PayPal Sandbox checkout. A learner reviews the offer, approves a test payment, and returns to the website. The server checks the completed payment against the intended account, plan, price, and currency before changing access. Interrupted payments can be checked again from the membership page, while unsuccessful payments leave the existing plan unchanged.

These are test payments, not nonprofit income. Timed purchases grant 30 or 365 days with no automatic renewal. Real-money payments, recurring subscriptions, refunds, and webhooks are outside the current implementation. Provider connection checks succeeded and completion logic is tested against mocked provider responses; a finished sandbox buyer transaction has not been represented as completed.

## An administrator workspace with an AI agent

The administrator can manage the program through forms or through the floating **Ask NextStep** chat. A message such as “Show the plans in a table” produces a readable response. A supported change produces a proposal with **See exact changes**. Staff can review the affected fields, type **apply**, **cancel**, or explain an adjustment.

The agent supports course drafts and edits, plans, participant records, mentor profiles and sign-ins, existing meeting requests, staff-directed application responses, member needs, in-app announcements, events, resources, manual results, funding, and basic settings. Direct, unambiguous course archive requests can save immediately. Other changes follow the review/apply workflow.

Mentor sign-in creation is a complete supported action. An administrator can supply a name, review the new profile/account proposal, and receive a generated username and temporary password once after applying it. Unprovided experience remains pending, capacity starts at zero, and staff still need to verify the mentor. A staff-created learner record has a different purpose: it tracks a participant, while learner self-registration creates a login.

Course authoring also uses plain language. Staff describe the intended audience and outcome, then inspect the draft in a normal editor. They can change every lesson and assessment field, ask AI to revise the content, undo a revision, and practice the draft in learner preview. Preview progress is temporary and does not contaminate real reports. Publishing is a staff decision; existing learners keep the version they already started.

The agent is useful because its work connects to the program's actual records. It still has explicit limits. It cannot grant arbitrary roles, change existing credentials, edit genuine assessment outcomes, send external messages, collect money, delete records, or deploy code. Supported actions pass through server-side permissions and validation. Multi-action work can partially succeed, so results identify what was saved and where processing stopped.

## Keeping support and evidence together

Members can share a need, set its category and priority, and see the team's response and status. Administrators can use these records to follow up on individual barriers rather than relying on a chat message being remembered.

In-app announcements can reach the whole program or a cohort and include read acknowledgments. The website also has reviewed email/SMS drafts for reminders, group updates, and individual follow-ups, with contact consent and queue states. The public Pages review blocks external delivery and has no cron sender. It does not claim that a message was delivered merely because a draft exists.

Results combine saved course comparisons with separately entered workshop records. Staff can filter by cohort or career stage, use supported CSV import/export, and print an impact snapshot. A move from 40% to 70% is reported as a 30-percentage-point change, based on completed assessment pairs. Confidence stays a separate self-reported measure. These records help explain what happened in the program; they are not proof that it caused a job offer or other life outcome.

Funding records track prospects, applications, commitments, receipts, deadlines, and notes. The distinction between requested and received money matters. NextStep organizes that work but does not apply for grants, process donations, or manufacture evidence of impact.

## How the website is built

Cloudflare Pages serves the browser interface. A bundled Worker/Pages Functions API handles `/api/*` requests, authenticates accounts, checks roles, and calls external providers. Cloudflare D1 stores profiles, courses, progress, requests, plans, results, and related program records. The public review database is separate from local development.

AI requests run on the server using an administrator-configured OpenAI API model and key. Saved AI and PayPal secrets are encrypted with a server-held encryption secret and are not returned to the browser. The agent receives a limited program index; private contacts, grades, learner stories, application answers, and support summaries are excluded. Anything an administrator types directly into a prompt is part of that request.

Sessions use protected cookies and server-enforced role checks. Revision checks help avoid overwriting another edit. Enrolled course snapshots preserve the content used for a learner's results. The current website/API suite has 94 passing tests, including role boundaries, learning feedback, matching, payments, agent behavior, and safe Markdown rendering. The provider tests use mocks rather than claiming live delivery or payment completion.

## A useful demonstration order

1. Open the website and explain the learner, mentor, and administrator roles.
2. In administrator learner preview, search a course, show its starting assessment, read a lesson, and try the practice question.
3. Show the completed-course feedback flow and explain the optional private follow-up course. Use actual recorded results only when they exist; preview does not create outcomes.
4. Open mentor discovery, review a real profile if available, and show the open staff request path when no suitable mentor exists.
5. Edit a plan's benefits and course access, then use **Try this plan as a learner** to show the difference.
6. Ask the agent for a table or a draft change, expand **See exact changes**, and explain the apply/cancel workflow. Apply only changes intended for the shared review workspace.
7. Show member needs, results, and funding as the staff follow-up tools, then point out that payment and external communication remain test/review workflows.

## Current status

NextStep is a working website and a substantial hackathon review build. It brings the core learning, mentoring, membership, and administration flows together without requiring staff to edit JSON. Publishing the curriculum does not add fictional participants, invent mentor availability, or create activity records to make the program appear active.

Before real participant onboarding, the organization still needs account recovery/MFA decisions, verified mentor processes, retention and backup/restore procedures, content review, and a fuller accessibility/security assessment. Payment and communication limitations are explicit. The goal of this version is to make the software concrete enough to test, understand, and improve with the program team.
