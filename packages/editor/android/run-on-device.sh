#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Prepares the device with `thumbjar prepare`, then runs the device tests for IME_LANG. A prep step that
# breaks exits before any test runs, with a PREP FAILED line naming the step.
# Every stage runs under `timeout -k`, so a hang shows up as a logged timeout and the stage ends within
# its cap plus the kill-after: reading the test stage's cap 10 + 5 seconds, prep 600 + 10, the tests
# `DEVICE_TEST_FILE_SECONDS` (1825, thumbjar's `src/device/budget.ts`) + 10, the diagnostics after them
# 60 + 5. The README sums these into the workflow's step timeout.
# Run it after `pnpm build:android`. It runs from `packages/editor` wherever it is started, since
# `pnpm exec` needs the package's manifest.
set -u
cd "$(dirname "$0")/.." || exit 1
lang=${IME_LANG:-en}
out=android/out
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
fail() { log "PREP FAILED: $*"; exit 1; }

echo "BOOTED at $(date +%s)" | tee -a "$out/timing.txt"
tests_seconds=$(timeout -k 5 10 node --input-type=module -e "import {DEVICE_TEST_FILE_SECONDS} from 'thumbjar/vitest'; console.log(DEVICE_TEST_FILE_SECONDS)")
[[ $tests_seconds =~ ^[0-9]+$ ]] || fail "read the test stage timeout from thumbjar/vitest"
log "http server"
pnpm exec thumbjar serve android/dist --port 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

pnpm exec thumbjar prepare --keyboard "$lang" --page-url http://localhost:8765/editor.html --out-dir "$out" || exit 1

# Records through the test stage, its kill-after and the diagnostics after it.
(timeout -k 5 $((tests_seconds + 10 + 65)) adb logcat -v time > "$out/logcat.txt" 2>&1 &)

log "tests start"
timeout -k 10 "$tests_seconds" pnpm exec vitest run --config vitest.android.config.ts --project device "tests/$lang.test.ts" < /dev/null 2>&1 | tee -a "$out/vitest.log"
status=${PIPESTATUS[0]}
log "tests rc=$status"

timeout -k 5 60 bash -c '
  adb logcat -d -b crash > "$1/logcat-crash.txt"
  adb shell dumpsys activity exit-info com.android.chrome > "$1/chrome-exit-info.txt"
  adb exec-out screencap -p > "$1/final.png"
' _ "$out" || log "diagnostics after the tests rc=$?"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
exit $status
