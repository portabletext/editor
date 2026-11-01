#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Usage: android/run-on-device.sh tests/<file>.test.ts, with IME_LANG the keyboard to prepare.
# Prepares the device with `thumbjar prepare`, then runs the one device test file it is given. A prep step
# that breaks exits before any test runs, with a PREP FAILED line naming the step.
# Every stage runs under `timeout -k`, with the caps `scripts/budget.ts` sums into the workflow's step
# timeout: reading the test stage's cap for the file, prep, the tests under that cap, the device check
# after a failed prep or test stage and the diagnostics after the tests.
# The device check reads `adb get-state` once the failed stage has ended, so it never changes a test's
# outcome. It writes its own `CHECKED device` or `CHECKED lost` line to timing.txt before it logs anything,
# and the workflow retries a lost device once. A check that never completes, or whose `adb get-state` proves
# nothing, writes nothing, and the run reads as unchecked, never as reachable or lost. A run that needed no check writes `CHECKED skipped`.
# Run it after `pnpm build:android`. It runs from `packages/editor` wherever it is started, since
# `pnpm exec` needs the package's manifest.
set -u
cd "$(dirname "$0")/.." || exit 1
file=${1:?usage: android/run-on-device.sh tests/<file>.test.ts}
lang=${IME_LANG:-en}
out=android/out
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
skipped() { echo "CHECKED skipped at $(date +%s)" >> "$out/timing.txt"; }
fail() { log "PREP FAILED: $*"; skipped; exit 1; }
device_check() { log "device check: $(timeout -k 5 10 node android/scripts/emulator-runs.ts device-state "$out/timing.txt" || echo unchecked)"; }

echo "BOOTED at $(date +%s)" | tee -a "$out/timing.txt"
tests_seconds=$(timeout -k 5 10 node android/scripts/budget.ts "android/$file")
[[ $tests_seconds =~ ^[0-9]+$ ]] || fail "read the test stage timeout for $file"
log "http server"
pnpm exec thumbjar serve android/dist --port 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

if ! pnpm exec thumbjar prepare --keyboard "$lang" --page-url http://localhost:8765/editor.html --out-dir "$out"; then
  device_check
  exit 1
fi

# Records through the test stage, its kill-after, the device check and the diagnostics after it.
(timeout -k 5 $((tests_seconds + 10 + 15 + 65)) adb logcat -v time > "$out/logcat.txt" 2>&1 &)

log "tests start, $file under $tests_seconds seconds"
timeout -k 10 "$tests_seconds" pnpm exec vitest run --config vitest.android.config.ts --project device "$file" < /dev/null 2>&1 | tee -a "$out/vitest.log"
status=${PIPESTATUS[0]}
log "tests rc=$status"
if [ "$status" -eq 0 ]; then skipped; else device_check; fi

timeout -k 5 60 bash -c '
  adb logcat -d -b crash > "$1/logcat-crash.txt"
  adb shell dumpsys activity exit-info com.android.chrome > "$1/chrome-exit-info.txt"
  adb exec-out screencap -p > "$1/final.png"
' _ "$out" || log "diagnostics after the tests rc=$?"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
exit $status
