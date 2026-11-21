#!/usr/bin/env bash
set -euo pipefail

# Prefer explicitly supplied paths, then the already installed local toolchains.
# These exports affect this process only; no shell profile or SDK is modified.
nextstep_flutter_sdk="${FLUTTER_SDK:-/home/raghav/Developer/toolchains/flutter}"
if [[ ! -x "$nextstep_flutter_sdk/bin/flutter" ]]; then
  nextstep_flutter_command="$(command -v flutter || true)"
  if [[ -z "$nextstep_flutter_command" ]]; then
    printf '%s\n' 'Flutter was not found. Set FLUTTER_SDK to your Flutter SDK directory.' >&2
    exit 1
  fi
  nextstep_flutter_sdk="$(cd "$(dirname "$nextstep_flutter_command")/.." && pwd)"
fi

if [[ -z "${JAVA_HOME:-}" && -x /home/raghav/Developer/toolchains/java21/bin/java ]]; then
  export JAVA_HOME=/home/raghav/Developer/toolchains/java21
fi
if [[ -z "${ANDROID_HOME:-}" && -d /home/raghav/Android/Sdk ]]; then
  export ANDROID_HOME=/home/raghav/Android/Sdk
fi
export PATH="$nextstep_flutter_sdk/bin:${JAVA_HOME:+$JAVA_HOME/bin:}${ANDROID_HOME:+$ANDROID_HOME/platform-tools:}$PATH"
cd "$(dirname "$0")/.."
exec "$nextstep_flutter_sdk/bin/flutter" "$@"
