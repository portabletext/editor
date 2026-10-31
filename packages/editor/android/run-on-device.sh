#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Prepares the device with `thumbjar prepare`, then runs the device tests for IME_LANG. A prep step that
# breaks exits before any test runs, with a PREP FAILED line naming the step.
# Every stage runs under `timeout -k`, so a hang shows up as a logged timeout and the stage ends within
# its cap plus the kill-after: prep 600 + 10 seconds, the tests 1680 + 10, the diagnostics after them
# 60 + 5. The README sums these into the workflow's step timeout.
# Run it after `pnpm build:android`. It runs from `packages/editor` wherever it is started, since
# `pnpm exec` needs the package's manifest.
set -u
cd "$(dirname "$0")/.." || exit 1
lang=${IME_LANG:-en}
out=android/out
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }

echo "BOOTED at $(date +%s)" | tee -a "$out/timing.txt"
log "http server"
pnpm exec thumbjar serve android/dist --port 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

pnpm exec thumbjar prepare --keyboard "$lang" --page-url http://localhost:8765/editor.html --out-dir "$out" || exit 1

(timeout -k 5 1800 adb logcat -v time > "$out/logcat.txt" 2>&1 &)

# Three tests of at most `TYPE_ON_DEVICE_WORST_SECONDS` (535s, thumbjar's `src/device/budget.ts`) each,
# plus Vitest's own startup and global setup.
log "tests start"
timeout -k 10 1680 pnpm exec vitest run --config vitest.android.config.ts --project device "tests/$lang.test.ts" < /dev/null 2>&1 | tee -a "$out/vitest.log"
status=${PIPESTATUS[0]}
log "tests rc=$status"

timeout -k 5 60 bash -c '
  adb logcat -d -b crash > "$1/logcat-crash.txt"
  adb shell dumpsys activity exit-info com.android.chrome > "$1/chrome-exit-info.txt"
  adb exec-out screencap -p > "$1/final.png"
' _ "$out" || log "diagnostics after the tests rc=$?"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
exit $status
