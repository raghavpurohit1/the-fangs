# NextStep: three-minute hackathon demo

**Core story:** A learner should be able to make progress today, even when a volunteer mentor cannot meet today. NextStep joins self-paced learning, targeted human support, and honest program evidence.

The judging weights from the supplied presentation are impact 30%, functionality 25%, creativity 20%, design 15%, and communication 10%. The strongest demonstration is one complete learner journey followed by the staff view of that journey, not a tour of every button.

## Prepare before recording

1. Start the local app or the verified `workers.dev` demo. Use only fictional data. Confirm the URL actually works before putting it into a submission.
2. Open separate administrator and learner sessions. Use `admin` / `test1234` and the current local Test learner, `learner` / `learn1234`, or **Create learner account**. No activity or results are preloaded. For the mentor view, create an active mentor profile in **Mentors**, then **Create mentor login** with your own username/password. No mentor is seeded or invited automatically. Use another browser profile, or sign out of the learner session before signing in as mentor.
3. The default workspace starts with empty participant, mentor, event, result, and funding records. Create only the test records needed for your rehearsal and describe them accurately. Restarting the server does not reset the database or restore deleted samples.
4. Rehearse one three-lesson path. Keep the baseline, one lesson check, and the final result as the essential recorded moments. Use a brief labeled edit/time cut if completing all lessons would exceed the limit; do not imply an unfinished path was completed.
5. Keep an admin tab ready on Home, then Results. The [dashboard screenshot](screenshots/admin-dashboard.jpg) is a backup visual, not proof of a current live deployment.
6. Confirm the guidance label. Say “prepared course guide” if it is in fallback mode; say “live AI guidance” only when the response says so. No external email/SMS sending is needed. Admin **Settings** can change the model and store an encrypted, write-only key, but no live key is supplied for this review. Do not show any real key while recording.

## Script and screen plan

Aim for 2:45–2:55 to leave room for transitions. The wording below is approximately a three-minute presentation at a calm pace; rehearse and trim to your delivery speed.

| Time | Screen/action | Suggested narration |
| --- | --- | --- |
| 0:00–0:20 | Learner overview; show prototype/demo label | “TechWomenAZ supports women at different stages of their technology careers. Our brief highlighted scarce mentor time, limited funding, and results scattered in Google Docs. NextStep helps someone keep learning while staff focus human support where it is useful. We started with an empty workspace; this walkthrough shows the test activity we create.” |
| 0:20–0:45 | My profile; share a need; assistant plan | “Start with the person: their goal, experience, and story. Members can say what support they need and see the staff response. The next-step assistant suggests a plan and available courses; it never claims to book or send anything. Optional grades never decide who gets access.” |
| 0:45–1:20 | Learning path: baseline, lesson/check, guide, completion result | “When no mentor is available, the learner still has a next step. Each short path has a baseline, three lessons with checks, and different follow-up questions. Guidance is labeled prepared or live AI. Progress is saved, and the result compares this learner's own before and after.” |
| 1:20–1:45 | Request support; mentor My mentees | “Human connection remains part of the journey. Suggestions use shared experience and career stage. Staff assign the connection. The mentor sees only assigned mentees and can update the meeting rhythm, next date, and shared notes. The link opens the program's existing video tool. Membership plans control new course access, mentoring requests and AI help; the app does not collect payments.” |
| 1:45–2:15 | Admin Home; change cohort; open Results | “The program team sees completed paths, people waiting for support, and paired score changes with sample sizes. Workshop records can be entered or imported from CSV, while course and workshop outcomes stay separate. These are observed changes, not a claim that our app caused a career outcome.” |
| 2:15–2:40 | Funding, then Messages reviewed draft/in-app post | “Funding opportunities and received funds have different statuses, so the team can prepare an honest impact snapshot. Staff can also post cohort updates or review an email or text. The queue respects recorded consent. Demo delivery is disabled; production adapters are ready for configured providers and delivery testing.” |
| 2:40–2:55 | Return to learner overview | “Our contribution is continuity: useful learning between mentor sessions, a clearer next conversation, and records that help a small team explain what happened. We built the journey on Cloudflare Workers and D1, with a responsive interface and persistent results.” |

If the recording must be shorter, omit the Funding screen and mention it in one sentence while showing the impact report. Preserve the baseline-to-follow-up comparison and the mentor request because they show the central value directly.

## Tie the demonstration to the rubric

| Criterion | Evidence to show | Keep the claim grounded |
| --- | --- | --- |
| Impact — 30% | Useful learning while waiting, visible mentor demand, participant history, paired result counts | Needs come from the brief; sample improvements are fictional, not real organizational impact |
| Functionality — 25% | Sign in, save progress, submit a mentor request, filter results, edit a record, refresh to show persistence | Show at least one complete saved workflow; optional integrations should be labeled accurately |
| Creativity — 20% | Connect course preparation to scarce mentor time and funding evidence | Explain the connection between features instead of claiming the first mentorship app |
| Design — 15% | Clear learner/mentor/admin journeys, readable empty states, optional sensitive fields, mobile-friendly layouts | Use calm pacing and visible labels rather than many rapid clicks |
| Communication — 10% | One learner's problem, the implemented journey, and an honest next step | Stay under three minutes and distinguish built behavior from launch work |

## Submission handoff

The supplied deck calls for a Cloudflare `workers.dev` URL, a public repository, and a video no longer than three minutes, with a stated 1:30 submission deadline. Confirm the event's current local deadline and form before submitting; this file does not infer a new calendar date or timezone from that time alone.

The [public Pages review](https://nextstep-techwomenaz.pages.dev) is live, with both agreed review logins verified. It is a shared test deployment, not the separate production Worker. The requested public target is Pages; the supplied deck separately names a `workers.dev` URL. Check which target the submission accepts. See [Pages deployment details](PAGES_DEPLOY.md); no production Worker deployment is claimed.

Before publishing a repository, confirm no secrets, `.dev.vars`, local D1 state, or real participant exports are included. Optional checked-in fixtures are used by tests; the dashboard screenshot shows the cleared workspace. Add the actual working demo and video URLs to the submission only after verifying them.

## Useful answers for judges

**Can mentors sign in?** Yes. Staff create a profile and its login. Mentors see only assigned mentees and their own profile, not grades, contacts, or program-wide records. There is no default mentor password.

**Does it replace a mentor?** It provides structured practice and prepares better questions while a person waits. Human support remains staff-coordinated.

**How do you measure progress?** Compare the same enrollment's baseline and follow-up quiz, show how many pairs exist, and report confidence separately. This is practice evidence, not causal proof or certification.

**Are mentors verified?** Not automatically. The default workspace has no mentor profiles. A real program would define a staff verification process before marking a mentor verified.

**Is the matching AI?** The current suggestions use explainable keywords and career stage. School grades do not affect rank or access. Lesson guidance can optionally use the configured server-side AI model.

**What can the assistant do?** It suggests next steps and published courses using the question, the member's own goal, and their role. It is a planning assistant with a labeled prepared fallback, not an agent that sends messages or changes records. No live API key was supplied for this verification.

**Do membership tiers require payment?** No. Community, Guided, and Supporter are staff-managed program groups with editable descriptions. Admins can set prices and control new course access, mentoring requests and AI help. The app does not collect payments or manage paid subscriptions.

**Can you actually send messages or hold calls?** Production has Resend/Twilio adapters and a consent-aware queue, but demo sending is blocked and live delivery needs setup/testing. Meetings use external HTTPS room links; there is no built-in video infrastructure.

**Is this production-ready?** It is a working prototype with tested access rules, persistence, and selected concurrency safeguards. Real adoption still requires verified provider setup, recovery/MFA decisions, mentor checks, data operations, and an independent review. We do not call a hackathon test suite a completed production audit.

**Where did the needs come from?** The public [TechWomenAZ site](https://techwomenaz.org/) supplies organizational context. Mentor scarcity, funding constraints, and Google Docs recordkeeping were separately reported by the project requester. We have not presented those as findings from a public-site audit.
