# Android build toolchain

This project was bootstrapped with the existing Flutter 3.47.5 (Dart 3.13.4), Temurin Java 21.0.12.1, Android SDK API 36, Build Tools 36.0.0, and NDK 28.2.13676358. The current Flutter checkout reports `user-branch`; it was used without changing or upgrading that shared SDK. The native application ID is `dev.nextstepcommunity.nextstep_mobile`; the launcher name is **NextStep**. Android 7.0 / API 24 or newer is required by the current Flutter/plugin setup.

Installed paths on this workstation:

- Flutter: `/home/raghav/Developer/toolchains/flutter`
- Java: `/home/raghav/Developer/toolchains/java21`
- Android SDK: `/home/raghav/Android/Sdk`

The wrapper uses these existing paths when environment variables are not supplied. It changes only its own process environment, never shell profiles or global installations. On another machine, set `FLUTTER_SDK`, `JAVA_HOME`, and `ANDROID_HOME` to that machine's SDK directories, or put Flutter on `PATH`.

From `mobile/`:

```bash
./tool/flutter.sh pub get
./tool/flutter.sh analyze
./tool/flutter.sh test
./tool/flutter.sh build apk --debug
```

The installable test APK is `build/app/outputs/flutter-apk/app-debug.apk`. It is signed with a local Android debug certificate and is **not a Play Store release**. For an Android device connected through USB or wireless debugging:

```bash
/home/raghav/Android/Sdk/platform-tools/adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

For the smaller ARM64 download used by modern Android phones:

```bash
./tool/flutter.sh build apk --release --target-platform android-arm64 --split-per-abi
```

This produces `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`. The verified initial optimized build was 18.7 MB, compared with 153 MiB for the universal debug build. Despite the optimized `release` build mode, its signing certificate is still the local **Android Debug** certificate: this is an internal test APK. Split APKs include an architecture offset in Android's version code (2001 for ARM64 with app version `0.1.0+1`). Future updates should use the same signing key and a compatible, increasing version code.

Android SDK licenses were already accepted. Linux desktop tooling is not installed and is not needed for the Android build. A separate task-owned emulator was created and stopped without changing the user's existing AVD; final installation targets the explicitly connected Android phone.

The main Android manifest includes internet access, rejects unencrypted HTTP, and disables application backups so stored sessions are not restored without their Android Keystore keys. Only public API origins belong in app configuration. OpenAI and messaging provider secrets stay in the server.

## Signing and other platforms

The generated release build currently uses the same local debug certificate for internal testing only. Before a store release, create and protect a dedicated upload keystore, configure release signing, and complete Play Console distribution requirements. Do not commit signing keys or their passwords.

An iOS project is included, but this Linux workstation cannot compile or sign an iOS application. On macOS, use Xcode, configure the bundle identifier and signing team, verify the secure-storage plugin configuration, and test on an iOS device before distributing through TestFlight or the App Store.

The web scaffold is available for development. It has not replaced or been published over the existing Pages web application. Native Android uses the existing HTTPS API; a browser build additionally needs same-origin hosting or an intentional API CORS configuration.

References: [Flutter Android setup](https://docs.flutter.dev/platform-integration/android/setup), [Android build and signing](https://docs.flutter.dev/deployment/android), [Flutter iOS setup](https://docs.flutter.dev/platform-integration/ios/setup), [secure storage configuration](https://pub.dev/packages/flutter_secure_storage).
