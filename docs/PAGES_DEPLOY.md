# Cloudflare Pages review deployment

This is an additional deployment target. The existing Workers configuration and its production cron remain in `wrangler.jsonc`. Pages uses `wrangler.pages.jsonc`, a dedicated D1 database, and the generated `dist/pages` folder.

Published and verified on November 21, 2026: [NextStep public review](https://nextstep-techwomenaz.pages.dev). The first verified deployment is [4a14fc14](https://4a14fc14.nextstep-techwomenaz.pages.dev). Login checks passed for `admin` / `test1234` and the explicitly created empty review participant `learner` / `learn1234`. The fresh remote database contains three courses, five resources, no mentor accounts, and no fictional program activity. No live AI or messaging provider key is configured; encrypted AI key storage is available.

The earlier survey and Android update is deployment [6a9c9e2d](https://6a9c9e2d.nextstep-techwomenaz.pages.dev). Both role logins, application arrays, and published survey UI were verified. The additive migration preserved both accounts and all three courses, with no application records inserted for testing.

The latest plan-management and career-stage update is deployment [9b5c9207](https://9b5c9207.nextstep-techwomenaz.pages.dev), served at the stable URL above. It adds editable plan prices, currencies, billing periods, active/default settings, and twelve career stages. Both review logins and normalized plan metadata were verified. Backend checks pass 63 tests; Flutter checks pass 20 tests and static analysis. The ARM64 internal test APK is version 0.1.1 / code 2002, 18,720,075 bytes, with SHA-256 `14d2bdea2068771b3e64d0b3daf2c5abafbd0a5db2970d10a7d9fc76791b6d78`. It installed successfully as an update on the connected Samsung SM-A156U1; no phone UI was driven or inspected. This update required no database migration or reset.

The review configuration deliberately sets `DEMO_MODE=true` and `SEED_DEMO_DATA=false`. It starts with the administrator, curriculum, and resource links, with no fictional learners or activity. Email and SMS delivery remain blocked. The initial review login is `admin` / `test1234`; change that password in Settings before giving a public URL access to real program data or a paid AI key. The public review database must stay separate from production.

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
