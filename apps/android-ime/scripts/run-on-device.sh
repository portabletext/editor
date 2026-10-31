#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Usage: IME_LANG=ja scripts/run-on-device.sh tests/ja.test.ts
# Prepares the device for IME_LANG, then runs the one device test file given. A prep step that breaks
# exits before any test runs, with a PREP FAILED line naming the step.
# Every stage runs under `timeout -k`, so a hang shows up as a logged timeout and the stage ends within
# its cap plus the kill-after: counting the tests 20 + 5 seconds, prep 600 + 10, the tests the file's cap from
# `scripts/suite-seconds.ts` + 10, the diagnostics after them 60 + 5. `scripts/lib/budget.ts` holds these
# numbers, and its unit test checks them against this script and the workflow's step timeout.
set -u
lang=${IME_LANG:-en}
file=${1:?usage: IME_LANG=<ja|en> scripts/run-on-device.sh <test file>}
out=out
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
a() { timeout -k 5 60 adb "$@"; local rc=$?; [ $rc -eq 124 ] && log "TIMEOUT adb $*"; return $rc; }
fail() { log "PREP FAILED: $*"; exit 1; }

prep() {
  # Play services runs a startup storm after boot. Chrome depends on its font provider and gets killed
  # when it ANRs, so wait until the system has been free of ANRs for 30s. No iteration starts after 240s,
  # so the settle ends within about 285s, and the prep deadline bounds it in any case.
  # Late ANRs (system, launcher) still pop a dialog that takes window focus. Suppress the dialogs.
  a shell settings put global hide_error_dialogs 1 || fail "hide error dialogs"
  log "settle start"
  quiet=0
  settle_start=$SECONDS
  while [ $((SECONDS - settle_start)) -lt 240 ]; do
    if timeout -k 5 20 adb logcat -d -b events 2>/dev/null | grep -q "am_anr"; then quiet=0; timeout -k 5 10 adb logcat -b events -c; else quiet=$((quiet + 5)); fi
    [ $quiet -ge 30 ] && break
    sleep 5
  done
  log "settle done after $((SECONDS - settle_start))s quiet=$quiet"
  log "diagnose start"
  timeout -k 5 60 scripts/diagnose.sh "$out" || log "diagnose rc=$?"

  # Make Chrome skip its first-run screens. Non-root Chrome reads this file only when it is the debug app.
  log "chrome flags"
  a shell am set-debug-app --persistent com.android.chrome || fail "chrome debug app"
  a shell 'echo "_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo" > /data/local/tmp/chrome-command-line' || fail "chrome command line"
  a shell cat /data/local/tmp/chrome-command-line

  log "soft keyboard"
  a shell settings put secure show_ime_with_hard_keyboard 1 || fail "soft keyboard"
  a shell settings get secure show_ime_with_hard_keyboard

  if [ "$lang" = ja ]; then
    log "japanese setup"
    timeout -k 10 240 node scripts/setup-ja.ts "$out" 2>&1 | tee -a "$out/ja-setup.log"
    rc=${PIPESTATUS[0]}
    log "japanese setup rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese setup, see ja-setup.log"
  fi

  log "logcat"
  a logcat -c
  curl -sf --max-time 5 --retry 5 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8765/editor.html || fail "http server, see http.log"
  log "http ok"
  a reverse tcp:8765 tcp:8765 || fail "adb reverse"
  a reverse --list
}

echo "BOOTED at $(date +%s)" | tee -a "$out/timing.txt"
# The suite's cap follows from the file's number of tests. A file that cannot be read fails before any
# device work.
suite_seconds=$(timeout -k 5 20 node scripts/suite-seconds.ts "$file") || fail "count tests in $file"
log "suite cap ${suite_seconds}s for $file"
log "http server"
node scripts/serve.ts dist 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

# One deadline for the whole prep. `prep` runs in a subshell, so its `fail` exits only the subshell.
export -f prep log a fail
export lang out
timeout -k 10 600 bash -c prep
rc=$?
[ $rc -eq 124 ] && log "PREP FAILED: prep ran past 600s"
[ $rc -eq 0 ] || exit 1

(timeout -k 5 $((suite_seconds + 120)) adb logcat -v time > "$out/logcat.txt" 2>&1 &)

log "tests start"
# `tests/setup.ts` writes the file's line of the job summary here, counting inconclusive calls and driver
# faults apart from passed and failed tests.
rm -f "$out/summary.md"
IME_SUMMARY_FILE="$out/summary.md" timeout -k 10 "$suite_seconds" pnpm exec vitest run --project device "$file" < /dev/null 2>&1 | tee -a "$out/vitest.log"
status=${PIPESTATUS[0]}
log "tests rc=$status"
[ -s "$out/summary.md" ] || echo "\`$file\`: no result, the test run ended with rc=$status before the file finished" > "$out/summary.md"
cat "$out/summary.md"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && cat "$out/summary.md" >> "$GITHUB_STEP_SUMMARY"

timeout -k 5 60 bash -c '
  adb logcat -d -b crash > "$1/logcat-crash.txt"
  adb shell dumpsys activity exit-info com.android.chrome > "$1/chrome-exit-info.txt"
  adb exec-out screencap -p > "$1/final.png"
' _ "$out" || log "diagnostics after the tests rc=$?"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
exit $status
