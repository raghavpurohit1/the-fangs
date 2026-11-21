# Cloudflare Pages review deployment

This is an additional deployment target. The existing Workers configuration and its production cron remain in `wrangler.jsonc`. Pages uses `wrangler.pages.jsonc`, a dedicated D1 database, and the generated `dist/pages` folder.

The current review is published at [NextStep](https://nextstep-techwomenaz.pages.dev), deployment [405fdc78](https://405fdc78.nextstep-techwomenaz.pages.dev). It includes the plain-chat admin agent, AI course generation and editing, mentor sign-in creation, course-result feedback with private follow-up courses, real mentor discovery and introduction requests, course search and plan locks, and PayPal test checkout. Saved AI and PayPal credentials are encrypted; provider connection checks passed. Payment completion is covered by mocked-provider integration tests; no buyer transaction is claimed as completed.

The catalog contains 12 practical study courses and seven academic subjects: forensic science, psychology, statistics, research methods, biology, chemistry and criminal justice. Existing user courses and participant records were preserved. These independent study materials do not award college credit.

Migrations `0004_course_snapshots.sql`, `0005_personal_learning.sql` and `0006_paypal_sandbox.sql` were applied locally and remotely without resetting records. Local browser checks verified that an expired admin session can reconnect and finish adding a learner without losing the form. Those migration checks did not add public test participants or activity.

The current deliverable is the website. Android download prompts have been removed from the website interface. Earlier mobile work remains in the repository separately.

The review configuration deliberately sets `DEMO_MODE=true` and `SEED_DEMO_DATA=false`. It starts with the administrator, curriculum, and resource links, without seeded fictional learners or activity. The owner later requested four clearly labeled shared test accounts; see [the testing guide](TESTING.md). Email and SMS delivery remain blocked. The initial review login is `admin` / `test1234`; change that password in Settings before giving a public URL access to real program data or a paid AI key. The public review database must stay separate from production.

The latest website check passed TypeScript validation and **108 automated tests**. Live browser checks verified course search, wrapping of long course URLs within cards, real mentor discovery with a staff-request form, and an actual AI reply rendered as a table. Local browser checks verified plan-selected course locks and upgrade navigation. Those initial checks did not create public test learning activity or mentor requests.

The November 21 follow-up audit fixed conflicting profile saves overwriting membership upgrades or deactivations, password changes reporting success after a conflicting update, AI program-settings changes using the wrong HTTP method, and floating-agent changes leaving the underlying page stale. Regression tests cover these cases, including preserving unsaved form drafts when the assistant refreshes the page. The dependency audit reported no known vulnerabilities. This was a five-minute targeted audit, with no claim of an exhaustive security assessment.

A subsequent seven-minute browser walkthrough completed local learner signup, application submission and staff follow-up, all lessons and both assessments of a course, missed-answer feedback, a course mentor request, and announcement acknowledgement. Admin browser checks covered course edits and learner preview, plan selection and preview, application review, announcements, workshop results and the funding report. A live admin AI request returned the correct course count and a formatted table; local learner guidance exercised the prepared fallback. Fixes preserve conversational context after reopening admin chat, retain successful action status when a later refresh fails, prioritize explicitly requested course subjects, and preserve commas inside course skills. Additional isolated API journeys verify mentor login and meeting updates, support replies, privacy, paid-plan expiry and AI access. PayPal buyer checkout, external email/SMS delivery and a live learner-provider AI call were not completed in this walkthrough. Messages currently supports announcements and support responses, not direct real-time person-to-person chat.

The extended account test created two fictional learners and two fictional mentors at the owner’s request, with paired mentor requests and a cohort-only announcement. All four live logins and role boundaries passed API checks. A live learner AI request returned a relevant Python course and mentor questions. Browser testing confirmed a learner support request, staff reply, announcement acknowledgement and mentor meeting updates; live API checks confirmed separate read receipts and rejection of a stale-account profile write. The follow-up fixes permanently revoke mentor sessions on archive and block stale browser tabs from saving or signing out as a different account. Isolated regression tests cover separate cookie stores, password rotation, logout isolation, reactivation and account switching. Shared test passwords are kept outside Git.

## One-time setup

Use the account intended to host the review app. If the current OAuth token lacks Pages or D1 permissions, refresh it:

```bash
npx wrangler login --scopes user:read account:read workers:write workers_scripts:write d1:write pages:write
npx wrangler whoami
```

Run `npm run pages:build` first to create the separate CLI working directory. Create a dedicated database and Pages project. These commands create resources but do not publish the website:

```bash
npx wrangler d1 create nextstep-pages-review
npx wrangler pages project create nextstep-techwomenaz --production-branch main --force
```

With this installed Wrangler version, `--force` on initial project creation explicitly chooses the requested Pages / `.pages.dev` target instead of automatic Workers delegation. Existing Pages projects deploy normally without that flag. If the project name is already taken, choose an available name, update `name` in `wrangler.pages.jsonc`, and use that name in the commands below. Copy the UUID from the D1 creation response into `d1_databases[0].database_id` in `wrangler.pages.jsonc`, replacing the current database UUID when creating another review instance. Keep binding name `DB`. The database name must match the database just created.

Initialize the **fresh** review database with the complete current schema:

```bash
npx wrangler d1 execute nextstep-pages-review --config wrangler.pages.jsonc --remote --file migrations/schema.sql
```

The mentor upgrade migration is for an existing database. A fresh database initialized from `schema.sql` already has mentor accounts and application surveys and does not need those upgrades. For an existing three-role database, add surveys before deploying the updated API:

```bash
npx wrangler d1 execute nextstep-pages-review --config wrangler.pages.jsonc --remote --file migrations/0003_applications.sql
```

This additive migration preserves records. Apply `0002` first only if upgrading an older two-role database; `0002` deliberately refuses to run after `0003` is installed.

Existing databases also need course snapshots before deploying the course editor:

```bash
npx wrangler d1 execute nextstep-pages-review --config wrangler.pages.jsonc --remote --file migrations/0004_course_snapshots.sql
```

This additive migration preserves current enrollments and their course content. A fresh `schema.sql` already includes it. Existing databases also need the learning-review and payment tables:

```bash
npx wrangler d1 execute nextstep-pages-review --config wrangler.pages.jsonc --remote --file migrations/0005_personal_learning.sql
npx wrangler d1 execute nextstep-pages-review --config wrangler.pages.jsonc --remote --file migrations/0006_paypal_sandbox.sql
```

A fresh `schema.sql` includes all of these tables. The AI agent uses the existing `meta` table.

Set the encryption secret before the first deployment. This pipeline creates a 32-byte hex key and passes it directly to Wrangler without displaying it. Keep this secret stable: changing it prevents existing saved AI credentials from being decrypted.

```bash
npm run pages:build
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | npx wrangler pages secret put AI_SETTINGS_KEY --project-name nextstep-techwomenaz --cwd dist/pages-config
```

Do not put API keys in `vars`, source files, build arguments, or the deployment folder. An administrator can save an OpenAI API key through Settings after deployment; the database stores authenticated ciphertext. Alternatively, `wrangler pages secret put OPENAI_API_KEY --project-name nextstep-techwomenaz --cwd dist/pages-config` accepts a server-managed key interactively. The review app does not require an AI key: its course guide and planning fallback still work.

## Build and publish

```bash
npm run pages:build
npx wrangler pages deploy --cwd dist/pages-config --branch main
```

`npm run pages:deploy` combines those two commands. It publishes to the project specified in `wrangler.pages.jsonc`; use the `.pages.dev` URL returned by Wrangler. Do not infer success from a guessed URL. Check the returned deployment, `/api/state`, login, and a saved record. Both Pages production and preview deployments inherit the review variables and D1 binding unless explicitly overridden; they share this review database.

The verified initial publish used `npx wrangler pages deploy --cwd dist/pages-config --branch main --commit-dirty=true` after the build, explicitly allowing the current uncommitted workspace. It deployed to Pages without `--force`; that flag was needed only when creating the new project. Live checks confirmed secure session cookies, learner isolation, and that `/_worker.js` returns the site's HTML fallback rather than server source.

Pages commands do not support a custom `--config` path in the installed Wrangler. The build generates `dist/pages-config/wrangler.json` from `wrangler.pages.jsonc`, and the Pages commands use `--cwd dist/pages-config`. This generated config is outside the uploaded asset directory. Rebuild after changing the source Pages config.

The build copies only `public/`, bundles the API into `_worker.js`, and emits `_routes.json` for `/api/*`. Other requests are static Pages assets, so `_headers` applies. The generated Worker exports only `fetch` and uses Pages' built-in `ASSETS` binding for asset fallback. The build does not read or copy `.dev.vars`, `.env`, the database, or secret bindings.

The Android download page is `/android.html` and links to `/downloads/NextStep-android-arm64.apk`. Build and verify that APK before publishing the landing page. The optimized ARM64 build is below Pages' per-file limit; the universal debug APK is too large. The downloadable APK is signed for internal testing, not Play Store distribution. Build instructions and signing limits are in [the mobile README](../mobile/README.md) and [toolchain notes](../mobile/TOOLCHAIN.md).

## Local Pages check

This uses a separate local database from `npm run dev`:

```bash
npm run pages:build
npx wrangler d1 execute nextstep-pages-review --config wrangler.pages.jsonc --local --persist-to .wrangler/pages-state --file migrations/schema.sql
npm run pages:dev
```

## Scheduled messages

This Pages deployment has no cron trigger. It does not automatically process future email or SMS jobs. In addition, `DEMO_MODE=true` blocks all provider sends, including manual attempts. The existing production **Worker** configuration retains the five-minute scheduled handler for a separately configured production deployment. Moving real scheduled delivery to Pages would require a separately deployed scheduled Worker and explicit production configuration; it is not included in this review publish.

Cloudflare references: [advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/), [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [invocation routes](https://developers.cloudflare.com/pages/functions/routing/), [D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases), and [Pages deployment and secret commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/).
