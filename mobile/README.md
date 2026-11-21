# NextStep for Android

A native Flutter companion to the [NextStep Cloudflare Pages app](https://nextstep-techwomenaz.pages.dev). It uses the same accounts and D1 data as the website. Android is the tested target; iOS scaffolding is present but has not been built or signed on this Linux machine.

## Use the app

The internal test build is available from [Get NextStep for Android](https://nextstep-techwomenaz.pages.dev/android.html). It targets ARM64 devices running Android 7.0 (API 24) or later. See [TOOLCHAIN.md](TOOLCHAIN.md) for the exact build and signing configuration. This is an internal testing APK, not a Play Store release.

- Learners: Home, Learn, Mentors, Plans, and More. Open **Application survey** from Home or More to apply to the program, edit a submitted application, and read staff feedback. Courses include assessments, lessons, and saved progress. More also includes messages, support requests, and profile details.
- Admins: Home, People, Plans, and More. Open **Applications** from Home or People to review learner surveys. Manage participants, mentors, meetings, courses, needs, events, resources, results, funding, program settings, and encrypted AI settings.
- Mentors: sign in through the website for their existing mentor workspace.

Advanced CSV import/export, full course authoring, and email/SMS queue controls open the website. Admins can add, price, edit, archive, and choose a default membership plan. Plans control new course access, mentoring requests and AI help using native form controls. The app does not collect payments. Course generation, full lesson editing and learner preview open the website from Manage → Course builder and learner preview. Manage → AI program agent opens the admin agent on the website; the browser may require its own sign-in. Twelve career stages are available in registration, learner profiles, and admin forms. Meeting buttons open external HTTPS video rooms.

The public review workspace has shared test logins documented in the root README. It blocks external email/SMS delivery and uses the server-configured AI key when available. Create a learner account for an individual test session. Do not enter real participant records into the shared review workspace.

## Build and check

From the repository root, with Flutter, Java, and the Android SDK installed:

```bash
mobile/tool/flutter.sh pub get
mobile/tool/flutter.sh analyze
mobile/tool/flutter.sh test
mobile/tool/flutter.sh build apk --release --target-platform android-arm64 --split-per-abi
```

The wrapper uses the existing local toolchains without changing shell profiles. Override `FLUTTER_SDK`, `JAVA_HOME`, or `ANDROID_HOME` when needed. The API defaults to `https://nextstep-techwomenaz.pages.dev`; an alternate HTTPS backend can be supplied with `--dart-define=API_BASE_URL=https://your-backend.example`. Never put API secrets in Dart defines. AI provider keys stay on the server.

Authentication uses the backend session cookie stored in platform secure storage, scoped to the API origin. Expiry or logout clears private application state and closes private routes. API requests use HTTPS, bounded timeouts, and no automatic mutation retries. Survey submissions and admin reviews use revision checks to prevent overwriting a newer response.

The current Android release configuration uses the local debug certificate for internal testing. Configure an organization-owned release keystore, versioning, recovery, and distribution before a public store release. Do not commit signing keys, local SDK paths, or generated build output.
