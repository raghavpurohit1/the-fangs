# NextStep user guide

Updated November 21, 2026. This guide covers the website and the Flutter Android review app.

**Website:** [nextstep-techwomenaz.pages.dev](https://nextstep-techwomenaz.pages.dev)

NextStep brings learner applications, short AI literacy courses, mentor coordination, membership plans, member support, communications, results, and funding records into one program workspace. It is an independent hackathon prototype for the TechWomenAZ use case, not the organization's official website.

## 1. Start here

1. Open the website on a computer or phone.
2. Choose **Create learner account** if you are joining as a learner. Enter your name, a unique username, a password, career stage, and goal. Use at least eight characters for a learner password.
3. Existing learners, mentors, and admins choose **Sign in** and use their assigned username and password. Usernames are not necessarily email addresses.
4. Your account role determines the pages you see. On narrow screens, use the navigation menu to switch pages.
5. Use **Sign out** when finished on a shared device.

Learners create their own sign-ins. An admin creates mentor logins. Adding a participant record in **Learners** does **not** create a usable login or send an invitation. There is no self-service admin registration.

The current public site is a shared **review workspace**. Use fictional information while testing. Its known review credentials are documented in the project's main README; they are not suitable for real participant data. The starter workspace contains curriculum and resources, with no fictional activity or results preloaded.

### Roles and permissions

| Role | Main capabilities |
| --- | --- |
| Learner | Apply to the program, manage their profile, complete courses, request mentors, view plans, read messages, and ask for support. |
| Mentor | View their professional profile and assigned mentees; coordinate assigned sessions. |
| Administrator | Manage people, plans, applications, content, communications, results, funding, and program/AI settings. |

Membership plans are separate from roles. A Supporter or paid-price plan does not make a learner an admin or mentor.

## 2. Learner walkthrough

### Complete your profile

Open **My profile**. Add your goal, career stage, story, relevant experience or résumé highlights, and optional coursework/grades. Save using **Save my journey**. On Android, find Profile under **More**.

Share only information useful to your program. Résumé highlights are text; this is not a file-upload service. Your admin manages your cohort and membership assignment. Optional email/SMS preferences record whether you agreed to receive that channel. A saved phone number or email alone does not opt you in.

Career stage choices are:

1. Exploring tech
2. Student or recent graduate
3. Building skills
4. Seeking first tech role
5. Early career professional
6. Career transition
7. Returning to work
8. Mid-career professional
9. Technical specialist
10. Growing as a leader
11. Senior leader or executive
12. Entrepreneur or founder

Choose the stage that best describes your current situation. You can update it later. Grades do not determine mentor suggestions or app access.

### Apply to the program

1. Open **Applications**, or the **Application survey** card on Home. On Android, use Home or More.
2. Select **Start learner application**.
3. Complete your goals and interests. These are required. On the website, separate interests with commas; supply 1–12 topics, each at most 120 characters.
4. Optionally describe your experience, availability/time zone, and practical support needs.
5. Submit and return to Applications to track the status and read the program team's response.

| Status | What it means |
| --- | --- |
| Submitted | Staff have received your application; you can edit and resubmit. |
| In review | Staff are reviewing it. Wait for their response. |
| Follow-up requested | Read the response, update your answers, and resubmit. |
| Accepted | Staff recorded acceptance. Contact the team about next steps. |
| Declined | Staff recorded a decision. Read the response for context. |

You can have one active learner application at a time. Accepted/declined applications stay in your history; you can start another if needed. Application decisions do not automatically change your account, membership plan, or course access. Submissions and reviews do not automatically send notifications; check this page for updates.

### Take a course and measure progress

1. Open **Learn** and choose a published course.
2. Complete the initial assessment and confidence check-in.
3. Work through the short lessons and answer each lesson check.
4. Use the course guide when you want another explanation.
5. Finish every required lesson, then take the follow-up assessment and confidence check-in.
6. Review the saved before/after results. Return later to continue unfinished learning.

The initial paths are **AI foundations**, **Practical prompting**, and **Career confidence with AI**. Staff can edit and publish content. Scores are practice measures, not certifications. The first baseline and first completed follow-up remain the recorded comparison.

The guide labels whether its answer is prepared course guidance or live AI. Prepared guidance works without an API key. Live AI requires valid server configuration and provider access; an unavailable provider falls back to prepared guidance.

### Find a mentor and join a meeting

1. Open **Find a mentor**.
2. Read professional profiles, experience, availability, and the displayed reasons for a suggestion.
3. Request a connection, describe your topic, and choose a cadence: one-time, weekly, every two weeks, or monthly.
4. If no mentor fits, ask the program team to find a match.
5. Check **Your connections** or Home for the confirmed next meeting, notes, and status.
6. Use **Join meeting** once staff or your assigned mentor adds an HTTPS meeting link.

Suggestions compare career stage and shared words in your profile and mentor experience. Staff coordinate the actual match. A request does not automatically book a time. Meeting links open an external video service; NextStep does not host calls or send calendar invitations. Cadence records an agreement, not a repeating booking. Meeting times display in your local time.

### Understand your membership plan

Open **Membership plans** to compare names, descriptions, benefits, prices, currencies, and billing periods. Your current plan is marked. Ask the program team if you need a different plan; staff control assignments.

Published prices are informational. NextStep does not collect payments, create paid subscriptions, or restrict course/mentor access by plan. An archived plan may remain visible if you are still assigned to it.

### Read updates and request help

- **Messages:** read program announcements and use the read acknowledgment control. Updates can be addressed to everyone or to your cohort.
- **Get help:** select **Share a need**, choose a category and priority, explain the support needed, and submit. Return to read staff responses and the open/in-progress/resolved status.
- **Planning assistant:** ask a focused question such as “Which course would help me get started with AI?” Review the suggested steps and take any action yourself.

The assistant does not enroll you, schedule meetings, send messages, or change records. Avoid including passwords, identification numbers, or private information about other people in questions or requests.

## 3. Administrator walkthrough

### Set up the program

Sign in as an admin and review **Home**. A useful setup order is:

1. **Settings:** confirm program name, description, contact URL, and suggested weekly learning goal.
2. **Membership plans:** review plan names, benefits, prices, and the default for new learners.
3. **Mentors:** create professional profiles and logins.
4. **Courses:** review the starter curriculum and publish the courses you want learners to see.
5. **Events and resources:** add current, approved links and opportunities.
6. Share the website link so learners can create their own accounts and apply.

### Manage plans and prices

1. Open **Membership plans** and select **Add plan**, or **Edit plan** on an existing card. On Android, use **Plans**.
2. Enter the plan name, description, and benefits. Use one benefit per line, up to 10 benefits of 120 characters each.
3. Choose a billing period: Free, Monthly, Yearly, or One-time.
4. Choose a currency: USD, CAD, EUR, GBP, AUD, or INR.
5. Enter the price in that currency, using at most two decimal places. Free plans save as zero; paid periods require a positive amount.
6. Keep the plan active if it should be available for new assignments.
7. Optionally make it the default for new learner accounts and newly created participant records.
8. Save, then check the card's displayed price and status.

Changing the default leaves existing assignments unchanged. To archive the current default, first make another active plan the default. Archive replaces deletion so membership history remains intact. Reactivate a plan to allow new assignments again. Up to 20 plans can be retained, including archived plans.

To assign a plan, choose a learner from the assignment section and edit their Membership plan field. You can also open **Learners**, edit the participant, select an active plan, and save. Existing archived assignments can be retained.

Saving a price does not charge anyone. Payment processing would require a separate integration.

### Review learner applications

Open **People → Applications**. Filter by status if helpful, read the survey, and select **Review application**. Choose the status and write a clear response explaining the next step. Save the review.

The applicant can read your response. It is not a confidential staff note. Review is manual; AI does not score or decide applications. If a conflict message appears, refresh and review the latest version before editing again.

### Manage learners and mentor accounts

**Learners:** add or edit participant details, stage, cohort, contact permissions, and plan assignment. Archiving a participant disables their account access. A newly added administrative participant record is for coordination and reporting; have people use self-registration when they need their own sign-in. There is no automated claim/invitation flow that merges these records.

**Mentors:** select Add mentor, enter professional details, expertise, relevant experience, career stage, availability, and capacity, then save an active profile. Select **Create mentor login** and choose a unique username plus an initial password of at least 14 characters. Share credentials through your approved channel; the app does not email an invitation. One login is linked to each mentor profile. Staff control active and reviewed/verified status.

Capacity means the maximum number of concurrent requests marked Scheduled. It is not a calendar or monthly quota. Review credentials through your organization's process before marking a mentor's experience as reviewed.

### Coordinate meetings

From **Mentors** or Home's mentor-request action, open a request, choose an active mentor, confirm the date/time, record cadence and the next meeting link, and save the appropriate status. On Android, use **People → Mentor meetings**.

Paste an externally created HTTPS video-room link. Share only notes intended for the learner. Mark completed meetings accurately to release mentor capacity. Overlapping appointments are not automatically detected; coordinate availability yourself. A future session cannot be marked complete.

### Respond to needs and communicate

**Member needs:** open a request, record one practical next step in the shared response, and update its status. The member sees your response in Get help.

**Messages:** publish an in-app announcement to everyone or a specific cohort. Learners acknowledge reading it. Editing an announcement resets acknowledgments so the revised content can be acknowledged again.

The website also supports reviewed email/SMS drafts for reminders, group announcements, and individual follow-ups. These require correct contact details and explicit channel consent. The current public review site blocks external sending and has no scheduled sender. Do not treat a queued draft as a delivered message. The production setup and provider requirements are in the operations runbook. Advanced queue controls are web tools, not native Android screens.

### Manage courses, resources, and events

Use **Courses** to edit course metadata and publish/unpublish a course. Full lesson and quiz authoring is available in the web editor; review its structured content carefully. Once enrollments exist, preserve assessment definitions and lesson IDs, or create a new course for a substantially different assessment.

Use **Events and resources** to add relevant links and descriptions and control whether records are active. A listed event is an informational entry; it does not create tickets or calendar invitations.

### Record results and demonstrate impact

Use **Results** to add workshop/program records with the participant, program, date, attendance, optional before/after scores, optional confidence, and notes. Missing scores should remain blank rather than being entered as zero.

For CSV import, create the participant records first, download the template from Results, use exact participant usernames, and preview before importing. Imports are manual, not a live Google Docs/Sheets sync. Re-importing a file creates duplicates; reconcile imported rows before retrying a partial failure.

Home's metrics and the impact snapshot help compare recorded activity:

- Completion rate: completed course enrollments divided by all enrollments in the selected view.
- Assessment change: follow-up minus baseline, in percentage points, for paired records only. A change from 40% to 70% is **+30 percentage points**.
- Confidence: a separate self-reported 1–5 measure.
- Mentor counts: waiting, scheduled, and completed request records.

Filter by cohort or stage, check the sample size, export results when needed, and use the printable snapshot for a reviewed report. These are descriptive measures, not proof that NextStep caused a career outcome. Workshop and course outcomes are separate.

### Track funding

Open **Funding** to record grant or sponsorship prospects, amounts, deadlines, notes, and status: prospect, applied, committed, received, or declined. Only records marked Received contribute to the received total. This is tracking, not accounting verification: the app does not submit grants, contact donors, or move money.

### Configure AI and program settings

In **Settings**, choose the exact provider model identifier and optionally enter a new OpenAI API key. On Android, use **More → AI settings**. Use a model your API account can access. A consumer chat subscription is not an API credential.

- Leave the key blank to retain the saved key.
- Use the removal control to remove the saved key; a server environment key may still be available.
- Saved keys are encrypted server-side and are not shown back to users.
- Saving settings does not verify model access or billing. Check the guide's displayed response mode when testing.

Program settings and plan settings are saved separately. The admin can change their password in Settings. There is no complete self-service password recovery or MFA flow yet.

## 4. Mentor walkthrough

Use the website with the login created by your program administrator.

1. Open **My profile** and keep expertise, relevant experience, stage, availability, and capacity accurate.
2. Open **My mentees** to see assigned learners and requests.
3. Review the learner's goal and shared background before a session.
4. Update assigned meeting details, shared notes, cadence, and completion status as agreed.
5. Ask staff to handle reassignment, verification, or activation changes.

Mentors can see the names, stages, goals, stories, and résumé highlights of assigned learners. They do not receive private grades, contacts, survey answers, support requests, other participants' records, funding, or AI settings. Meeting notes are shared with the learner. Use the web mentor workspace; the native Android app currently focuses on learners and admins.

## 5. Android app

Open **NextStep** on your Android phone and sign in with the same account used on the public website. Saved data synchronizes through the same Cloudflare backend.

| Account | Main navigation |
| --- | --- |
| Learner | Home, Learn, Mentors, Plans, More |
| Administrator | Home, People, Plans, More |

Pull down to refresh, use the refresh control where available, and use the phone's back navigation to leave a form. Android supports courses, applications, plan management, learner/admin records, meetings, and support. Advanced CSV, message delivery, and full course authoring use the website. This is an internal test build, not a Google Play release. iOS has not been built or distributed.

## 6. Troubleshooting

| Problem | What to do |
| --- | --- |
| “Username or password is incorrect” | Check the exact username and password. Learners can self-register; mentors need an admin-created login. An administrative participant record is not a login. Ask staff if the account was archived. |
| New features are missing | Reload the website. On Android, install the latest review build; an older app cannot use the new plan editor. |
| A page says to sign in again | Your session expired or was revoked. Sign in again; saved server records remain. |
| “This record changed” | Someone saved a newer version. Refresh and reopen the record before saving. |
| No mentors or events appear | The program has not published active records. Ask staff; no sample mentors are inserted automatically. |
| Join meeting is missing | A confirmed time and external meeting URL have not been saved yet. |
| AI says prepared guide | No usable live provider configuration is available, or the provider failed. Prepared guidance still works. |
| Email/SMS is not arriving | Public review delivery is disabled. A queue entry is not a delivered message. |
| A default plan will not archive | Make another active plan the default, then archive the old one. |
| Results show a dash or no change | There are no complete baseline/follow-up pairs in that filter. Complete a course or record the missing evidence accurately. |

## 7. A short hackathon walkthrough

Use fictional information in an isolated/local review where possible. Do not invent real program outcomes.

1. Show the admin Home and the empty or genuinely recorded metrics.
2. Open Membership plans; show price, billing, benefit, and default controls.
3. Create a learner account, choose one of the 12 stages, and submit an application.
4. Show the admin application review and the learner-visible response.
5. Start a course and explain baseline, lessons, follow-up, and saved progress.
6. Show the mentor request flow and explain staff-confirmed external meetings.
7. Submit a support need and show how staff can respond.
8. Show the funding tracker and an impact export without claiming money received or outcomes that were not recorded.

## 8. Cloudflare and current boundaries

| Component | Use in NextStep |
| --- | --- |
| Cloudflare Pages | Public website hosting, static assets, and the `pages.dev` address. |
| Pages Functions on Workers | Server API for authentication and program workflows. |
| Cloudflare D1 | Persistent accounts, applications, plans, courses, results, and other records. |
| Cloudflare secrets | Runtime secrets, including the key used to encrypt saved AI credentials. |
| Wrangler | Local development, D1 commands, builds, and deployment. |

The Android app uses the same HTTPS API and database. Workers AI, R2, KV, and Cloudflare video hosting are not part of this implementation. The Pages review has no scheduled sender; a separate production Worker configuration exists but is not deployed.

This is a tested review prototype, not a completed production security audit. Live AI, real messaging, payments, recovery/MFA, operational backups, and store distribution have separate setup or unfinished work. See [the operations runbook](OPERATIONS.md), [Pages deployment notes](PAGES_DEPLOY.md), and [Android README](../mobile/README.md) for exact technical details.
