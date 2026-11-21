# NextStep

**Team:** [YOUR TEAM NAME]

**Hackathon:** [HACKATHON NAME AND YEAR]

**Members:** [NAMES AND ROLES]

NextStep helps nonprofit programs connect learners with mentors, offer self-paced courses, and keep membership, communication, and outcome records in one place.

- **Website:** [Open NextStep](https://nextstep-techwomenaz.pages.dev)
- **Source:** [raghavpurohit1/the-fangs](https://github.com/raghavpurohit1/the-fangs)
- **User guide:** [How to use every workspace](docs/USER_GUIDE.md)
- **Android:** [Internal test build](https://nextstep-techwomenaz.pages.dev/android.html)
- **Presentation / demo video:** [ADD YOUR LINK]

> This is an independent hackathon prototype for the TechWomenAZ use case, not the organization's official site. The public deployment is a shared review workspace. Replace the bracketed placeholders and adapt this README before using it as your project's main README.

## The problem

Nonprofit teams have limited mentor time and funding. Information spread across documents makes it difficult to follow up with members, match mentors, and measure progress. NextStep brings those workflows together and gives administrators an AI assistant that can prepare and carry out supported program changes.

## What the app does

| Workspace | Main capabilities |
| --- | --- |
| Learner | Create an account, submit an application, complete courses and assessments, request mentoring, read announcements, ask for support, and update a profile |
| Mentor | View assigned mentees and meetings, manage meeting details, and maintain a professional profile |
| Administrator | Manage members, mentor accounts, applications, plans, courses, events, resources, communications, results, funding records, and program settings |
| AI agent | Prepare changes from plain English, show exact changes for review, apply approved actions, and keep an activity history |

### AI agent

Sign in as an administrator and open **AI agent**. Type a request, click **Prepare changes**, review the proposal, and click **Apply these changes** or **Cancel proposal**.

Examples to adapt:

- “Create a free Career Starter plan for beginners. Include all courses and AI help, but no new mentoring requests. Keep the current default.”
- “Create a three-lesson course about first technology interviews for beginners, with examples and practice. Keep it as a draft.”
- “Change the Guided plan to $20 per month, including all courses, AI help, and mentoring requests.”

The agent uses the model and API key saved in **Settings → AI settings**. It can manage plans, course drafts and content, participant records, mentor profiles, existing meeting requests, staff-specified application decisions, member-need responses, in-app announcements, events, resources, manual results, funding records, and basic settings. It supports up to five actions per proposal; proposals expire after 30 minutes.

It does not change passwords or API keys, grant account roles, alter actual learner assessment scores, send external messages, collect payments, delete records, or deploy software. Creating a learner record does not create a login. Multi-action requests run in order and stop if an action fails; the history shows what succeeded. Missing details require a follow-up request.

### Courses without JSON

Open **Courses → Create a course**, describe the topic and audience, choose the lesson count, and generate a draft. Edit ordinary fields for lessons, examples, answer choices, correct answers, and starting/final assessments. Save it as a draft or publish it. AI generation requires a configured API key; manual authoring remains available without one.

Use **Try as a learner** or the course preview to practice without saving test progress or calling paid AI. Existing enrollments keep their original course version when administrators edit a course.

### Membership plans

Admins can change names, descriptions, benefit text, prices, currencies, billing periods, active status, and the default plan. Access controls choose all, selected, or no new courses, plus mentoring requests and AI help. Plan cards offer **Try this plan as a learner**. Existing enrollments and meetings remain available after plan changes.

Prices are informational: there is no checkout or automatic billing. Membership is assigned by staff.

### Connections and results

The app includes twelve career stages, learner applications, mentor suggestions and assignment, meeting cadence, external video-room links, support requests, cohort announcements, CSV import/export, manual program results, and funding tracking. Assessment metrics compare a learner's before/after scores; they do not establish that the program caused a career outcome. Funding records track opportunities and amounts without moving money.

## Technology

| Layer | Technology |
| --- | --- |
| Website | HTML, CSS, and JavaScript on Cloudflare Pages |
| API | TypeScript in an advanced-mode Pages Functions Worker |
| Database | Cloudflare D1, bound as `DB` |
| AI | Server-side OpenAI Responses API with structured output |
| Credentials | Cloudflare secret bindings; saved AI keys encrypted server-side |
| Android | Flutter and Dart using the same HTTPS API |
| Optional messaging | Resend email and Twilio SMS adapters |
| Checks | TypeScript, Node test runner, Flutter analysis and tests |

The current deployment does not use Firebase, Workers AI, R2, KV, or built-in video hosting. Meeting links open an external provider.

## Run locally

Use Node.js 22 or later compatible with the locked Wrangler version:

```bash
npm ci
npm run db:local
npm run dev
```

Open the localhost URL printed by Wrangler. `db:local` initializes a fresh database. For existing databases, apply the ordered migrations in [OPERATIONS.md](docs/OPERATIONS.md); do not reset stored records. Course editing requires `0004_course_snapshots.sql`.

Learners use **Create learner account**. Admins create mentor logins from an active mentor profile. Shared review credentials are documented in the main project README; replace those accounts before using real participant data.

## Configure AI

1. Configure the server's `AI_SETTINGS_KEY` encryption secret using the [Pages setup guide](docs/PAGES_DEPLOY.md).
2. Sign in as an administrator and open **Settings → AI settings**.
3. Choose an OpenAI model available to your API account and save the API key.
4. Try **AI agent** or generate a course draft to verify that the model and billing access work.

A consumer chat subscription does not replace an API key. Keys stay on the server and are never returned to the browser. The agent sends your request and a limited program index to the provider; contact details, grades, private profile stories, and application answers are excluded from that index. Text you enter in a request is sent as part of the request.

## Check the code

```bash
npm run check
npm test
mobile/tool/flutter.sh analyze
mobile/tool/flutter.sh test
```

Backend tests use disposable databases and mocked AI/messaging responses. They cover role checks, course versions and plan access, proposal review/apply/cancel behavior, stale edits, duplicate execution prevention, and preview isolation. Flutter tests cover authentication, navigation, applications, plans, and record forms.

## Deploy to Cloudflare Pages

Configure your Cloudflare account, Pages project, D1 database, migrations, and secrets first. The repository currently targets `nextstep-techwomenaz` and D1 `nextstep-pages-review`; update `wrangler.pages.jsonc` for your own project.

```bash
npm run pages:build
npx wrangler pages deploy --cwd dist/pages-config --branch main --commit-dirty=true
```

The build writes upload assets to `dist/pages` and a CLI configuration to `dist/pages-config`. Follow [PAGES_DEPLOY.md](docs/PAGES_DEPLOY.md) for initial provisioning and migration commands.

The public review deployment has `DEMO_MODE=true`, sample activity disabled, external email/SMS blocked, and no cron trigger. A separately configured scheduled Worker is needed for automatic future message delivery.

## Build Android

Install Flutter, Java, and the Android SDK, then run:

```bash
mobile/tool/flutter.sh pub get
mobile/tool/flutter.sh build apk --release --target-platform android-arm64 --split-per-abi
```

Output: `mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`.

The native app includes learner/admin workflows and plan controls. Its admin workspace links to the web AI agent, full course builder, and learner preview. This internal APK uses a local debug signing certificate; configure an organization-owned release keystore before store distribution. See [mobile/TOOLCHAIN.md](mobile/TOOLCHAIN.md).

## Repository layout

```text
src/                   API, AI integrations, validation, and messaging
public/                Browser interface and Android download assets
migrations/            Fresh schema and ordered database upgrades
mobile/                Flutter application and tests
tests/                 Backend, AI agent, and preview tests
scripts/               Pages build packaging
docs/USER_GUIDE.md      Role-by-role usage instructions
docs/OPERATIONS.md      Configuration and operational limitations
wrangler.pages.jsonc   Cloudflare Pages and D1 configuration
```

## Project status and next steps

This is a working prototype, not a completed production security audit. Before real participant onboarding, complete account recovery/MFA and verification decisions, backup/restore testing, retention processes, accessibility review, content review, production signing, and provider testing.

- [ADD YOUR TEAM'S NEXT PRIORITY]
- [ADD A LINK TO YOUR ISSUE TRACKER]

Never commit `.dev.vars`, `.env` files, provider credentials, database files, or signing keys.

## Team and credits

| Member | Contribution |
| --- | --- |
| [NAME] | [ROLE / CONTRIBUTION] |
| [NAME] | [ROLE / CONTRIBUTION] |
| [NAME] | [ROLE / CONTRIBUTION] |

**Acknowledgments:** [MENTORS, ORGANIZERS, AND OTHER CREDITS]

## License

[CHOOSE A LICENSE, ADD ITS LICENSE FILE, AND REPLACE THIS TEXT.]
