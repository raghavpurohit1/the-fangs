# NextStep operations

This runbook describes the repository's implemented behavior. Run all commands from the repository root. Use fictional information in demo environments; the production environment is deliberately separate.

## Local setup

```bash
npm ci
npm run db:local
npm run dev
```

Open the address Wrangler prints. The local administrator is `admin` / `test1234`. This review workspace also has an empty Test learner account, `learner` / `learn1234`; fresh databases do not seed it. Use **Create learner account** for a new learner. No mentor account or activity is seeded. No service credentials are required for courses, mentor coordination, program records, funding, in-app updates, or prepared course guidance.

`npm run db:local` applies `migrations/schema.sql` to the local `nextstep-db`. Tables are created if absent; it does not erase existing records. First use initializes only the administrator, courses, official resource links, and settings. Participants, mentors, events, results, and funding start empty. Restarting the server does not reset learning progress, undo admin edits, or restore removed sample records. Sample fixtures are available only with explicit `SEED_DEMO_DATA=true` on a fresh, isolated demo database; automated tests opt in. Keep the default `false` for this workspace.

`npm run check` checks TypeScript; `npm test` runs backend and communication tests. Both operate locally. Provider requests in adapter tests are mocked. The browser interface should also be exercised after UI changes: login, course completion, a mentor request, filtered metrics, a record edit, and a communication draft.

### Configuration

| Variable | Purpose | Required? |
| --- | --- | --- |
| `DEMO_MODE` | Exactly `true` enables the local administrator credentials and external-send block | Set explicitly in each environment |
| `SEED_DEMO_DATA` | Exactly `true`, together with `DEMO_MODE=true`, enables optional sample fixtures on first initialization | Default `false`; tests opt in |
| `ADMIN_PASSWORD` | Password for the first production administrator initialization | Production bootstrap only; at least 14 characters, excluding the demo passwords |
| `AI_MODEL` | Default Responses model, initially `gpt-6.2-sol`; an admin-saved model overrides it | Optional |
| `OPENAI_API_KEY` | Environment fallback for course guidance and planning | Optional; a saved key overrides it |
| `AI_SETTINGS_KEY` | 64 hexadecimal characters used to encrypt saved API keys with AES-256-GCM | Required to save a key through Settings |
| `RESEND_API_KEY` | Resend email credential | Optional, paired with `EMAIL_FROM` |
| `EMAIL_FROM` | Authorized sender email or `Name <address>` | Required for email delivery |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Required for SMS delivery |
| `TWILIO_AUTH_TOKEN` | Twilio account credential | Required for SMS delivery |
| `TWILIO_FROM_NUMBER` | Authorized Twilio sender in E.164 format | Required for SMS delivery |

For local optional credentials, create an ignored `.dev.vars` next to `wrangler.jsonc`. Use `.dev.vars.production` for an explicitly isolated production-environment local test. Do not place keys in `public/`, commit them, or add them to Wrangler `vars`. Cloudflare documents environment-specific secret files and deployed secret bindings in its [secrets guide](https://developers.cloudflare.com/workers/configuration/secrets/).

Example shape, with placeholders rather than usable credentials:

```dotenv
OPENAI_API_KEY="replace-locally-if-needed"
```

Leave the key absent to test the prepared guide. The `aiAvailable` flag means a key is configured; it does not confirm billing, model access, or provider health.

### Existing database mentor upgrade

Fresh databases use the three-role constraint in `migrations/schema.sql`. Existing databases created with only `admin`/`learner` require `migrations/0002_mentor_accounts.sql` before creating mentor logins. Reapplying the bootstrap schema does not change that old constraint.

Back up the database and pause writes first. The migration rebuilds the users table and restores dependent records, indexes, and sessions. Apply the whole file to the intended binding, not hand-selected statements:

```bash
npx wrangler d1 execute nextstep-db --local --file=migrations/0002_mentor_accounts.sql
```

For an existing production database, replace `nextstep-db --local` with `nextstep-prod --env production --remote`, after a separate backup and review. No remote migration is claimed here. The migration was tested against a populated disposable legacy database, including dependent-record preservation and a repeat run. Check foreign keys and participant/session counts afterward.

### Existing database application survey upgrade

After the mentor schema upgrade, apply the additive survey migration to an existing database:

```bash
npx wrangler d1 execute nextstep-db --local --file=migrations/0003_applications.sql
```

For the Pages review database, use `nextstep-pages-review --config wrangler.pages.jsonc --remote`. Fresh databases initialized from the current `schema.sql` already include this table. The migration preserves existing records and can be repeated. The older `0002` migration refuses to run after the survey migration, preventing its users-table rebuild from deleting survey records.

Learner applications are visible only to their owner and administrators. Mentors do not receive these responses. A learner can submit one active application, edit it while submitted or awaiting follow-up, and view the staff response. Reviews use submitted/in-review/follow-up/accepted/declined statuses, with revision checks for concurrent changes. Acceptance does not change account role, membership tier, or app access. Survey answers are not sent to AI and are not scored automatically.

## Cloudflare deployment

The repository separates local review, the published Pages review, and an undeployed production Worker:

| Environment | Mode | D1 | Data |
| --- | --- | --- | --- |
| Default/local preview | `DEMO_MODE=true`, `SEED_DEMO_DATA=false` | `nextstep-db` | Administrator, courses, official resources, and settings; no sample activity |
| Public Pages review | `DEMO_MODE=true`, fixtures off | `nextstep-pages-review` | Dedicated review database; admin and empty Test learner |
| `production` Worker, not deployed | `DEMO_MODE=false` | `nextstep-prod` | Curriculum plus one administrator on first initialization |

The default database ID is a local placeholder. The production ID is `REPLACE_WITH_PRODUCTION_D1_DATABASE_ID` until an operator binds an actual database. `npm run deploy` targets **production**, not the public demo.

The [public Pages review](https://nextstep-techwomenaz.pages.dev) is live. Publish verification confirmed `admin` / `test1234` and `learner` / `learn1234`, three courses, five official resources, and no mentor profiles or preloaded activity/results. These are shared review credentials, not production accounts. Change the administrator password before using real data or a paid AI key.

Pages uses `wrangler.pages.jsonc` and a dedicated cloud D1 database, separate from local and production data. A separate cloud `AI_SETTINGS_KEY` enables encrypted key storage; a saved provider key is configured; live course generation was verified on November 21, 2026. `DEMO_MODE=true` blocks all email/SMS sending. This fetch-only Pages build has no cron, so it cannot process scheduled messages automatically. See [the Pages runbook](PAGES_DEPLOY.md) for build, deployment, and secret commands.

The production Worker described below has not been deployed. Its database binding and strong bootstrap credential still require setup. The former Pages/D1 authorization blocker was resolved for the review publish; that does not configure the separate production environment.

### Production Worker sequence

1. Run `npx wrangler whoami` and verify the intended account. If necessary, run `npx wrangler login` and authorize the required Workers and D1 access. Credentials belong in the operator's secure environment.
2. Create a dedicated database:

   ```bash
   npx wrangler d1 create nextstep-prod --env production
   ```

3. Put the returned database ID in `env.production.d1_databases[0].database_id` in `wrangler.jsonc`, retaining binding `DB` and database name `nextstep-prod`. Inspect any automatic Wrangler config changes so the ID lands in the intended environment.
4. Apply the schema to that remote database:

   ```bash
   npm run db:remote
   ```

5. Set the bootstrap password through the prompt, not a command argument:

   ```bash
   npx wrangler secret put ADMIN_PASSWORD --env production
   ```

6. Set any optional provider secrets needed for this deployment. Then validate and deploy:

   ```bash
   npm run check
   npm test
   npm run deploy
   ```

7. Open the returned Worker URL. Confirm that demo badges and public demo logins are absent, sign in as `admin` with the bootstrap password, and verify there are no fictional participant, mentor, funding, or event records. Production initializes published courses and program settings only, plus the administrator. Update organization settings before inviting anyone.

The bootstrap secret is used only when creating the initial administrator. Changing it after initialization does **not** reset the stored administrator password; use the in-app password-change flow while signed in. There is no forgotten-password flow.

Cloudflare's [D1 getting-started guide](https://developers.cloudflare.com/d1/get-started/) documents database creation, bindings, and remote schema commands. This project has a bootstrap schema plus the explicit mentor-role upgrade described above; review future upgrades separately before applying them to existing data.

### Optional Workers review deployment

The current public review uses Pages. To publish an additional Workers review instead, use a separate remote database named `nextstep-db`, bind its ID in the top-level configuration, apply `migrations/schema.sql` with `npx wrangler d1 execute nextstep-db --remote --file=migrations/schema.sql`, and deploy the default environment with `npx wrangler deploy --env=""`. Keep `DEMO_MODE=true`.

That deployment intentionally has public demo administrator credentials. Anyone with them can alter its content. Use it only as a demonstration, do not place real participant information there, and keep it separate from production. A fresh seed is not an automatic rollback of subsequent edits.

The application stores a `database-mode` marker. Switching a seeded demo database to production, or the reverse, fails closed. Do not delete the marker to repurpose a database containing public demo accounts. Provision a fresh database instead.

## Learning and AI guidance

### Administrator AI settings

Only administrators can view or change AI configuration in **Settings** (`PUT /api/admin/ai-settings`). Enter a model identifier and optionally a new API key. The key field is write-only: plaintext and ciphertext are never returned to the browser. Saved settings use the private `meta` row `ai-settings-v1`, separate from shared program settings.

The local setup uses an ignored `.dev.vars` encryption secret; the published Pages review has its own cloud encryption secret. The separate production Worker requires a separately generated 64-character hexadecimal secret:

```bash
npx wrangler secret put AI_SETTINGS_KEY --env production
```

A saved API key overrides `OPENAI_API_KEY`. Blank preserves it; removing the saved key enables any environment-key fallback. The UI reports the source. Without a valid encryption secret, a model-only save is allowed when no saved key needs decryption, but saving a new key is rejected. The public review currently has an encrypted provider key configured.

Back up the encryption secret securely. Changing it does not re-encrypt existing data. A missing/wrong secret or damaged ciphertext blocks use of the saved key instead of silently falling back. Settings stays accessible with a safe error: restore the secret, replace the saved API key, or remove it. Replacement encrypts under the current secret. Saving settings makes no provider request and does not verify billing or model access.


The three initial paths cover AI foundations, practical prompting, and career confidence. Each has three lessons, a distinct pre/post assessment pair, and explanations. Enrollment saves the first baseline; completion requires each lesson check. Repeated completion submissions do not replace the first follow-up score. Assessment answers are scored on the server.

Course content is a practice resource, and answer keys are present in the browser payload. These are not secure examinations or validated credentials. Each enrollment retains its course content in `enrollment_courses`. Admins can edit all lesson and assessment fields; existing learners continue their saved version while new learners receive the latest published course. Course saves use revision checks and an atomic snapshot/update batch. Apply `migrations/0004_course_snapshots.sql` to existing databases before deploying this version; it backfills snapshots without changing scores or completions.

With no API key, the course guide returns prepared lesson material and honestly labels that mode. With a key, the Worker calls `https://api.openai.com/v1/responses` using the effective saved/environment model, an 18-second timeout, bounded output, and `store:false`. It sends the lesson text, explanation, and learner question. It does not send the learner's résumé, school grades, full profile, or other participants' records through this course-feedback route. The model has no tools and cannot send messages or change records.

An API error or unavailable model produces the prepared-guide fallback. Check the UI's response mode instead of promising live AI simply because a key exists. API usage is separately configured; no consumer chat subscription is assumed to supply this credential. Do not ask learners to paste sensitive information into questions.

### Next-step planning assistant

The separate `/api/assistant` route helps signed-in learners and administrators plan their next step. It accepts a question of up to 2,000 characters and limits requests to 30 per hour per account. Its provider input is an explicit allowlist: the question, the current user's own goal, their role, and a bounded list of published course titles/descriptions/skills/IDs. It does not include résumé text, grades, contacts, member-support notes, or other participants' data. Information a user types into the question is still part of that question.

With an API key it requests a strict JSON response and validates the returned structure, lengths, and course IDs before displaying a plan. Without a key or on provider/validation failure, it labels the result as a prepared program guide. Fallback and mocked-response tests cover this route. The same saved provider configuration has also been verified with a real course-generation request.

The assistant is a planner, not an autonomous operator. It cannot enroll someone, assign a mentor, schedule a meeting, send outreach, modify records, take payment, or verify a credential. Suggested course links navigate to the existing course flow, where the user still chooses the next action. Do not describe a generated plan as a completed enrollment, booking, or send.

## Participants, mentors, and meetings

Learners register with a username and password. They can update their own story, goals, résumé highlights, optional grades, and contact preferences. Staff control cohort assignments. Admin-created participant records support workshops and reporting but have random inaccessible passwords; there is no invitation or account-claim flow for them yet.

### Mentor accounts

The three roles are administrator, learner, and mentor. Community/Guided/Supporter are learner membership groups, not roles. Self-registration creates learners only.

In the administrator's **Mentors** page, save an active mentor profile, then choose **Create mentor login**. Enter a unique username and a password of at least 14 characters. One account is allowed per profile. No invitation or message is sent; share credentials through the program's approved channel. There are no default mentor credentials. Archiving the linked profile blocks new logins and access from existing mentor sessions.

Mentor **Home**, **My mentees**, and **My profile** show only the mentor's own professional profile, assigned requests, and assigned learners' names, stages, goals, stories, and résumé highlights. Grades, contacts, course results, other participants, funding, support notes, outbox, and AI settings are excluded. Mentors cannot use learner-course feedback or the planning-assistant route.

Mentors can edit their own professional details, expertise, experiences, stage, availability, and concurrent scheduled capacity. They cannot verify or activate themselves. They may update only assigned requests: status, date, HTTPS meeting link, shared notes, cadence, and last meeting. They cannot reassign requests. The same capacity and date checks apply. Session notes are visible to the learner, not private staff notes. Saving a profile or session does not send email or SMS.

Mentor suggestions use shared keywords from goal/story/résumé and mentor expertise/experience, plus a same-career-stage bonus. Grades are not read by the matching function or access checks. This heuristic is not a professional credential check, psychometric assessment, or guaranteed personal fit.

Staff create mentor records, record availability, and coordinate requests. Only active mentors with remaining scheduling capacity can receive an additional scheduled request. The capacity guard is atomic at database update time. Capacity is the maximum concurrent records marked `scheduled`, not a time-slot calendar or automatically replenishing monthly quota. Staff or the assigned mentor must mark past sessions completed to release capacity. Two overlapping times are not detected automatically.

One learner cannot have multiple open requests for the same mentor. A request can wait, be scheduled, or be completed; future sessions cannot be marked complete. A scheduled/completed request requires a mentor and date. Learners can request a one-time, weekly, every-two-weeks, or monthly cadence. Staff record the agreed cadence, last meeting, and next scheduled meeting. The last-meeting date cannot be in the future. Cadence is a recorded agreement; it does not create recurring appointments or inflate completed-session counts.

Meeting links must use HTTPS. Staff create the room externally and paste its URL. Video hosting, recordings, calendar invitations, and automatic recurring meetings are not implemented.

The `verified` flag is editable by staff. No mentor profiles are preloaded by default. Optional fixture mentors are unverified. Verify credentials and define an organization-approved process before setting it for real mentors.

### Member needs and membership groups

Members can share a concrete support need in mentoring, learning, career, community, accessibility, or other. They choose routine or soon priority and a summary up to 1,000 characters. The API permits 10 submissions per hour per learner. Members see only their own needs; administrators see the program's needs. Staff move a need through `open`, `in_progress`, and `resolved` and add a response of up to 2,000 characters. **The response is visible to the member**, not a confidential staff note. Status updates do not automatically send email or SMS.

Only staff can assign membership plans. Community, Guided, and Supporter remain the initial plans. In **Membership plans**, admins can create up to 20 plans, including archived plans, and edit each plan's name, description, benefits, price, currency (USD/CAD/EUR/GBP/AUD/INR), billing period (free/monthly/yearly/one-time), active status, and default selection. Prices allow two decimal places. Free requires zero; other periods require a positive price. Published prices are informational: there is no checkout, charge processing, paid subscription management, or automatic billing. Plan access settings enforce all/selected/no new courses, new mentoring requests, and AI help on the server. Existing enrollments and meetings remain usable. Profile, applications, announcements, and support requests stay available. Legacy plans default to their previous unrestricted behavior until staff change the controls.

Plan IDs are stable. Archive plans instead of deleting them to retain member assignments. Archived plans cannot be assigned to new members; an existing archived assignment can be retained. Exactly one active plan is the default for new learner accounts and new participant records. Changing the default does not move existing members. Choose another default before archiving the current default.

Plan changes use dedicated admin-only POST `/api/admin/membership-plan` and PUT `/api/admin/membership-plan/:id` endpoints, with revisions for edits and an atomic settings update. General program settings cannot replace the plans array. Legacy three-plan records acquire zero-price/active/default metadata on read without resetting stored values or requiring a database migration. Old clients that save plans through general settings must update to the new plan editor.

Twelve career stages are accepted consistently in profile validation, sign-up, mentor records, and the website/Android selectors. All four original stage values remain valid, so existing records do not need a migration.

## Communication workflows

### In-app updates

Administrators publish to all cohorts or one exact cohort. Learners see only active updates addressed to their current cohort or to everyone. Mark-as-read records an acknowledgment; it is not email delivery, an automatic page-view event, or evidence that someone understood the message. Editing an update clears its saved read acknowledgments. Reads and edits carry the content revision; a stale tab must refresh before acknowledging or overwriting a revised post.

### Email and SMS setup

Email uses [Resend's send-email API](https://resend.com/docs/api-reference/emails/send-email). Configure an authorized sender and complete [domain verification](https://resend.com/docs/dashboard/domains/introduction), then set:

```bash
npx wrangler secret put RESEND_API_KEY --env production
npx wrangler secret put EMAIL_FROM --env production
```

SMS uses [Twilio's Messages API](https://www.twilio.com/docs/messaging/api/message-resource) with Account SID/Auth Token authentication and an authorized sender number:

```bash
npx wrangler secret put TWILIO_ACCOUNT_SID --env production
npx wrangler secret put TWILIO_AUTH_TOKEN --env production
npx wrangler secret put TWILIO_FROM_NUMBER --env production
```

Use a phone number with `+`, country code, and digits. Complete any provider requirements for the sender and destination before trying a real delivery. Providers may charge for API use; SMS length can create multiple billable segments. No accounts, numbers, or credits are purchased by this application.

The UI's configured indicator only checks whether required values exist. It does not verify credentials or sender approval. Provider adapters use fixed official endpoints, bounded eight-second timeouts, no automatic retries, and safe error messages. They do not log credentials, recipients, or message bodies. See [Twilio authentication guidance](https://www.twilio.com/docs/usage/requests-to-twilio) for production credential management; the current adapter uses the Account SID/Auth Token interface documented above.

### Review, queue, deliver

The following delivery mechanics describe the production Worker configuration. Public Pages review sends are blocked and its fetch-only bundle has no scheduled handler.

1. Record the participant's actual email/SMS permission in their profile. An address or phone number alone is insufficient.
2. In **Messages**, choose email or SMS, a template, and eligible participants. Templates cover meeting reminders, group announcements, and individual follow-ups. Replace placeholders; every recipient gets the same message text.
3. Review exact recipients and content. Saving creates persistent queue jobs; it does not send immediately unless a scheduled time becomes due and the production scheduler processes it.
4. Leave the scheduled time blank for a separate manual send action. An explicit send before a future scheduled time is rejected. With a scheduled time, the separately configured production Worker cron checks every five minutes and processes up to 25 due queued jobs per run. It is an earliest-send time, not an exact-delivery promise.
5. Cancel queued, failed, or unconfigured jobs if they should not be sent. A processing job or final/uncertain provider outcome cannot be recalled by this app.

The queue endpoint requires a stable 8–100 character `requestId`. Retries by the same administrator with the same payload return the same jobs. Reusing the ID with a different payload is rejected. Separate drafts with different IDs are separate sends, even if their text is identical.

Before delivery, the Worker atomically claims the job, then rechecks that the participant is active, still opted into that channel, and still has the same contact value saved when queued. Otherwise it cancels the job. Changing a contact resets its opt-in unless the submitted update explicitly reconfirms it. The backend records the latest consent-change actor and time; it does not provide a complete consent audit history.

| Job status | Meaning and operator action |
| --- | --- |
| `queued` | Stored, not attempted. Send manually when ready or wait for its scheduled production run. |
| `processing` | Claimed for one delivery attempt. Do not create a replacement while its outcome is pending. |
| `sent` | Provider accepted the request. This is not delivered/read confirmation. |
| `failed` | Definite rejection. Review the cause before a deliberate retry. |
| `unconfigured` | Required provider configuration is absent. Configure the channel before a deliberate retry. |
| `unknown` | The outcome could not be confirmed, for example a timeout after the provider may have accepted it. Check the provider before creating another message. No automatic retry. |
| `canceled` | Canceled by staff or by a failed recipient/consent recheck. |

The scheduled handler only attempts due `queued` jobs. It does not automatically retry `failed`, `unconfigured`, or `unknown` jobs. It marks a job left `processing` for more than five minutes as `unknown`. Resend receives an idempotency key; its [documented key-retention window](https://resend.com/docs/dashboard/emails/idempotency-keys) does not replace this app's queue protection. The Twilio adapter does not assume that an arbitrary idempotency header prevents duplicate SMS.

**Demo delivery is blocked in both the send endpoint and the scheduled handler**, even if credentials exist. Live delivery and provider receipts have not been exercised as part of the mocked test suite. There is no inbound SMS, STOP webhook, email unsubscribe link, bounce handler, or provider status callback yet. In-app profile preferences are the implemented opt-out mechanism; integrate the provider-side workflows before broad real-world sending.

## Program records and funding

Program records store a participant, workshop/program, date, attendance, optional before/after scores, optional confidence, and notes. Scores range from 0–100; confidence ranges from 1–5. Missing values remain missing, not zero.

CSV import is a manual migration aid, not a live Google Docs or Sheets integration. Create participant records first and use the exact username in the CSV. Download the template from **Results**. It supports:

```csv
participant_username,program,date,before_score,after_score,confidence_before,confidence_after,attendance,notes
replace-with-participant-username,Example workshop,2026-11-21,40,75,2,4,attended,Template example
```

The import validates a file smaller than 1 MB, with 1–500 rows, known participants, real ISO dates, and supported columns. Preview before importing. Rows are saved individually; a partial failure can leave earlier rows saved. Importing the same file afresh creates duplicate records. Keep a migration log and reconcile counts rather than treating an import as idempotent. CSV exports escape formula-like values.

Workshop and funding updates use revision checks: stale edits return a conflict instead of overwriting newer data. Database triggers record accepted inserts/updates with before/after values, actor, and time. The admin-only `/api/admin/audit` endpoint exposes the latest 200 entries. This audit coverage applies to program-result and funding records, not every profile, course, announcement, or queue action.

Funding records are tracking entries, not payment transactions or verified accounting. Statuses are `prospect`, `applied`, `committed`, `received`, and `declined`. Only amounts explicitly marked `received` enter the received total. No grants are submitted, donors contacted, or money moved by this workflow. The print view lets staff save a reviewed impact snapshot as PDF through the browser.

## Metric definitions

| Measure | Definition |
| --- | --- |
| Learners in view | Participant records matching the selected cohort and career stage. Record status and learning activity are different concepts. |
| Active learners | Unique learners with a recorded enrollment, lesson completion, or course completion within the last 30 days. Logging in alone does not count. |
| Enrollments / completions | Course enrollment records / enrollment records with a saved completion time. A person can contribute multiple enrollments. |
| Completion rate | Completed enrollments divided by all enrollments in the view; 0 when none exist. |
| Paired count | Enrollments with both baseline and follow-up scores. This is enrollment pairs, not necessarily unique people. |
| Average before / after | Means across that same paired set. Incomplete follow-up records are excluded from both means. |
| Score change | Mean of each paired follow-up minus baseline, in percentage points. Missing sample displays no result rather than an invented zero. |
| Confidence change | Mean paired confidence difference on the 1–5 self-report scale, for score pairs that also have both confidence values. |
| Waiting requests | Requests currently marked waiting. |
| Average wait | Mean elapsed days from creation to now for requests still waiting, not completed-session wait time. |
| Scheduled / completed sessions | Counts by the staff-maintained request status. |
| Workshop observed change | Paired before/after differences within manually recorded workshop rows, reported separately from courses. |
| Funding received | Sum of active funding records marked received; applications and commitments are separate. |

Cohort/stage filters apply consistently to the course dashboard and its course CSV export. The workshop report and funding views have their own filters; the printable report uses its stored course, workshop, mentor, and funding sections separately. Do not add workshop and course participants together as unique people. Archived participant records remain in historical course metrics; an archived record is not a deletion of prior activity.

The measures describe stored activity and observed change. They do not establish causal program impact, job placement, productivity saved, validated skill certification, or return on funding. Review assessments, samples, missing follow-ups, and duplicated workshop rows before using a report externally.

## Authentication, access, and data operations

Passwords are salted PBKDF2-SHA256 hashes. Sessions use random tokens stored as hashes in D1, an HTTP-only SameSite cookie, a Secure cookie on HTTPS, and a 12-hour lifetime. Admin APIs enforce the role on the server; learner state includes only that learner's enrollments/requests plus published shared content. Deactivating a participant revokes sessions. Administrator password changes revoke other sessions.

Mutation endpoints check same-origin browser requests, input types, lengths, and relevant field permissions. Rate limits cover login, registration, guidance, and communication actions. These controls are implemented protections, not a substitute for an independent audit. The application is one organization per deployment; cohorts are targeting/filtering fields, not separate tenant-admin security boundaries.

D1 holds participant profiles, contact preferences, learning results, application survey responses, workshop notes, queue contact snapshots/message bodies, and audit history. Only administrators receive administrative records and the outbox. Use approved access, retention, deletion, and backup practices for real records. The application has no complete account/data erasure UI, automated retention job, or tested disaster-recovery procedure. Protect exports as participant data. Do not use an outcomes CSV as a full database backup.

Worker observability is enabled in configuration. Operational errors should be reviewed in Cloudflare, and provider outcomes checked in their dashboards. Avoid pasting logs containing private records into public issues. Make a verified database export/restore plan before a production migration; record schema version and application version with the backup. No backup job is configured by this repository.

## Known limitations

- No MFA, password reset, email/phone ownership verification, account invitation/claim flow, or authentication emails. Registration is open and username-based.
- No mentor credential verification service, time-zone availability search, calendar conflict detection, or hosted video infrastructure. Mentor logins are created by staff; no automated invitation or password recovery is implemented.
- No email/SMS delivery receipt webhooks, bounce/unsubscribe processing, or inbound text handling. Live provider delivery still needs end-to-end testing with a controlled recipient.
- Revision protection and audit trails cover program/funding records, not every entity. Profiles and other content can still have last-write-wins edits.
- The current scheduler is a bounded D1-backed polling workflow, not a high-volume queue service. Large deployments need capacity, latency, failure-recovery, and load testing.
- Practice quiz keys are visible to clients. Assessment validity and content review are program responsibilities.
- Database creation/deployment requires the correct Cloudflare authorization and real environment bindings. No production security audit, live-delivery certification, or recovery drill is claimed.

## Evidence behind the prototype

Public observations were reviewed on 2026-11-21 from [TechWomenAZ](https://techwomenaz.org/): support across career stages, mentorship and community, career/AI/leadership themes, upcoming-event announcements through social channels, and the public membership form. The site's event state is not evidence of a malfunction.

Mentor scarcity, limited funding, inadequate software, and Google Docs result storage were reported in the project brief. Proposed benefits such as reduced scattered recordkeeping and better continuity between events are design hypotheses, not measured results. All sample people, companies, events, donations, and outcomes remain fictional.

### Course creation and learner preview

POST `/api/admin/course/generate` accepts a plain-language brief, audience and 1–8 lesson count. It uses the saved AI model/key, the Responses API with a strict course schema, a 45-second timeout, a 12,000-token output limit and a 10-per-hour administrator limit. It sends no learner records, saves no course, and reports setup/provider/validation failures without returning raw provider errors. The admin reviews a validated draft in ordinary form fields before saving or publishing. [Structured outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs) describes the API format.

Learner preview substitutes an in-memory practice profile and intercepts every API request before network access. Course assessments and guidance run locally; other submissions are blocked. It does not create accounts, enrollments, messages or live AI calls. Previewing a specific course intentionally allows drafts; plan previews filter to the plan's included published courses.


### Admin program agent

The administrator's **AI agent** is separate from the read-only next-step assistant. It uses the configured OpenAI Responses model/key, `store:false`, structured output, a 45-second provider timeout, and at most 7,000 output tokens to prepare up to five typed operations. Course creation makes an additional generation call during proposal preparation. `/api/admin/agent/propose` accepts a request of at most 6,000 characters, limited to 10 requests per hour per admin. AI preparation consumes provider usage even if the proposal is canceled.

The input includes the request and a bounded index of up to 200 records per collection. It excludes account secrets, contact details, private learner stories/résumés/grades, application answers, and member-need summaries. Explicitly named courses may contribute lesson/assessment content for editing (at most three courses, capped at 100,000 serialized characters). User-supplied request text is itself sent to the provider. The provider cannot choose an arbitrary endpoint or execute code; operations and fields are allowlisted server-side.

Supported operations cover plans, course drafts/edits, participant records, mentor profiles, existing meeting requests, staff-specified application status/responses, member-need responses, in-app announcements, resources, events, manual program results, funding records, and basic program settings. Existing API authorization and validation still apply. The agent cannot change credentials, roles, contact consent, professional verification, learner assessment records, or send external messages, collect money, delete records, or deploy software. Creating a participant record does not create a login. It does not make application eligibility decisions.

Proposals are stored in D1 `meta` under `agent-proposal:` keys and belong to the requesting admin. `GET /api/admin/agent/history` returns their latest 20 proposals. `POST /api/admin/agent/:id/apply` and `/cancel` accept empty objects. Proposals expire after 30 minutes. Apply checks whether target records changed, then atomically claims the proposal before calling the existing API handlers in sequence. A retry never re-executes a claimed proposal. Revision-protected endpoints also reject stale writes at save time.

This is not an all-or-nothing transaction across actions. Execution stops on the first failure and records `applied`, `partial`, or `failed` with per-action results. A process interruption can leave `applying`; inspect the affected records and history before issuing a replacement request. There is no automatic retry/resume. Proposals can contain copies of records and generated content; there is currently no retention cleanup job. Include these records in production retention and backup decisions. No additional schema migration is required for the agent itself.
