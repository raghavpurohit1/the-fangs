# NextStep

A mentoring and learning companion for nonprofit programs: help members learn while mentor time is limited, coordinate human support, and keep program records in one place.

**Live review:** [nextstep-techwomenaz.pages.dev](https://nextstep-techwomenaz.pages.dev)

**User guide:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

This README is a copy-ready example for the current repository. NextStep is an independent hackathon prototype for the TechWomenAZ use case, not the organization's official site. The public deployment is a review workspace, not a production certification.

## Features

- Learner, mentor, and administrator roles with server-enforced permissions.
- Learner applications with goals, interests, availability, support needs, and manual staff review.
- Twelve career stages across registration, profiles, mentor records, and filters.
- Short AI literacy courses with baseline/follow-up quizzes, lesson checks, and confidence ratings.
- Mentor suggestions, requests, staff assignments, meeting cadence, and external video-room links.
- Admin-managed plans: names, benefits, prices, currency, billing period, active status, and default selection.
- Member support requests, staff responses, and cohort-targeted announcements.
- Workshop records, CSV import/export, impact metrics, and funding tracking.
- Configurable server-side OpenAI model/key with prepared guidance when live AI is unavailable.
- Native Flutter Android workspaces for learners and admins.

Plan prices are informational; there is no checkout or payment collection. Meeting links open an external service. Email/SMS delivery is disabled on the public review deployment.

## Architecture

| Layer | Technology |
| --- | --- |
| Website | HTML, CSS, JavaScript on Cloudflare Pages |
| API | TypeScript Pages Functions using the Workers runtime |
| Database | Cloudflare D1 |
| Runtime secrets | Cloudflare secret bindings; saved AI keys encrypted server-side |
| Android | Flutter and Dart, calling the same HTTPS API |
| Optional AI | OpenAI Responses API; prepared fallback without credentials |
| Optional messaging | Resend email and Twilio SMS adapters |
| Tooling | Wrangler, TypeScript, Node test runner, Flutter tests |

The current project does not use Workers AI, R2, KV, Firebase, or hosted video calling.

## Run locally

Use Node.js 22 or later compatible with the locked Wrangler version. From the repository root:

```bash
npm ci
npm run db:local
npm run dev
```

Open the localhost URL Wrangler prints. The bootstrap command is for a fresh local database. For an existing legacy database, follow the ordered migrations in [OPERATIONS.md](docs/OPERATIONS.md) instead of resetting data.

The default configuration is review mode with sample activity disabled. Learners use **Create learner account**. Admins create mentor logins from an active mentor profile. Review-only administrator credentials are documented separately in the main project README; replace shared credentials before real use.

## Verify

```bash
npm run check
npm test
mobile/tool/flutter.sh analyze
mobile/tool/flutter.sh test
```

Backend tests use disposable databases and mocked delivery providers. They do not send real email or SMS. Flutter tests exercise authentication, navigation, survey and plan forms, and saved-data flows.

## Deploy to Cloudflare Pages

The configured Pages project is `nextstep-techwomenaz`, with D1 binding `DB` to `nextstep-pages-review`.

After the account, D1 schema, and required secret bindings are configured:

```bash
npm run pages:build
npx wrangler pages deploy --cwd dist/pages-config --branch main --commit-dirty=true
```

The build creates `dist/pages` for uploads and a separate `dist/pages-config/wrangler.json` for the CLI. Use the deployment URL returned by Wrangler. See [PAGES_DEPLOY.md](docs/PAGES_DEPLOY.md) for one-time setup and migration commands.

The public Pages deployment has `DEMO_MODE=true`, no sample activity, blocked external email/SMS, and no cron handler. The separate production Worker configuration is not deployed. Do not repurpose the shared review database for real participants.

## Build Android

Install Flutter, Java, and the Android SDK, then use the repository wrapper:

```bash
mobile/tool/flutter.sh pub get
mobile/tool/flutter.sh build apk --release --target-platform android-arm64 --split-per-abi
```

The APK appears at `mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`. This optimized internal build currently uses a local debug signing certificate. Configure an organization-owned release keystore and distribution process before publishing to a store. See [mobile/TOOLCHAIN.md](mobile/TOOLCHAIN.md).

The API origin defaults to the public Pages website. An alternate HTTPS backend can be supplied through `--dart-define=API_BASE_URL=https://your-backend.example`. Never put provider keys in the mobile build.

## Optional configuration

Core courses, applications, plans, records, and prepared guidance work without provider credentials. An admin can configure the OpenAI model and key in Settings. Keys stay server-side; saving does not verify provider access or billing. Real messaging requires provider setup, consent workflows, and an explicitly configured production sender.

Do not commit `.dev.vars`, `.env` files, credentials, database files, or signing keys.

## Repository layout

```text
src/                 TypeScript API, curriculum, AI and messaging adapters
public/              Website and Android download assets
migrations/          Bootstrap schema and ordered database upgrades
mobile/              Flutter app and native/widget tests
tests/               Backend integration and provider tests
scripts/             Pages build packaging
docs/USER_GUIDE.md    Learner, mentor, and admin instructions
docs/OPERATIONS.md    Configuration, data handling, and limitations
wrangler.pages.jsonc Public review Pages configuration
wrangler.jsonc       Local and separate production Worker configuration
```

## Before real deployment

Complete credential/account recovery and MFA decisions, backups and restore testing, data-retention processes, accessibility and content review, provider verification, and an independent security review. Prices do not create subscriptions; funding records do not move money; mentor status is staff-reviewed. Do not describe practice score changes as proof of program-caused career outcomes.

Add the team's names, repository URL, and chosen license before publishing this README as your project's final documentation.
