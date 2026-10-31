#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Usage: IME_LANG=ja scripts/run-on-device.sh tests/ja.test.ts
# Prepares the device for IME_LANG, then runs the one device test file given. A prep step that breaks
# exits before any test runs, with a PREP FAILED line naming the step.
# Every stage runs under `timeout -k`, so a hang shows up as a logged timeout and the stage ends within
# its cap plus the kill-after: counting the tests 20 + 5 seconds, prep 900 + 10, the tests the file's cap from
# `scripts/suite-seconds.ts` + 10, the diagnostics after them 60 + 5. `scripts/lib/budget.ts` holds these
# numbers, and its unit test checks them against this script and the workflow's step timeout.
set -u
# How long after boot Gboard gets to load its Japanese dictionary, `DICTIONARY_LOAD_SECONDS` in `scripts/lib/budget.ts`.
DICTIONARY_LOAD_SECONDS=360
lang=${IME_LANG:-en}
file=${1:?usage: IME_LANG=<ja|en> scripts/run-on-device.sh <test file>}
out=out
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
a() { timeout -k 5 60 adb "$@"; local rc=$?; [ $rc -eq 124 ] && log "TIMEOUT adb $*"; return $rc; }
fail() { log "PREP FAILED: $*"; exit 1; }
# Runs the function `$2` under a cap of `$1` seconds and 2 more to stop. A function that fails has logged
# its own PREP FAILED line.
stage() { timeout -k 2 "$1" bash -c "$2"; local rc=$?; [ $rc -eq 124 ] && log "PREP FAILED: $2 ran past $1s"; return $rc; }

# Gboard's `main` log from this boot, where it logs its dictionary load and session rebuilds, for the Japanese
# dictionary wait. The header ties the file to the boot, so a file from an earlier boot or one left behind never
# passes for this one, and `scripts/lib/dictionary.ts` reads only lines from after the boot time. logd's line
# counts for `main` after the seed show whether the buffer had dropped any line since boot. Each reader writes a
# `CAPTURE_SEGMENT` line first, and a reader that adb dropped is started again, dumping the buffer again, so a
# restart on a buffer that had dropped lines the capture never read shows as a capture fault.
capture_seed() {
  local file="$out/boot-logcat.txt" boot_id btime
  boot_id=$(a shell cat /proc/sys/kernel/random/boot_id | tr -d '\r')
  btime=$(a shell 'echo $(date +%s) $(cat /proc/uptime)' | awk '{printf "%d", $1 - $2}')
  [ -n "$boot_id" ] && [ -n "$btime" ] || fail "boot capture"
  echo "CAPTURE boot_id=$boot_id btime=$btime" > "$file"
  # A larger buffer leaves a restarted reader more room to dump again what it missed.
  a logcat -G 16M -b main || log "logcat -G failed"
  { echo "CAPTURE_SEGMENT seed"; a logcat -d -v epoch -b main; } >> "$file" 2>&1 || fail "boot capture"
  a logcat -S -b main | awk '$1 == "Total" && total == "" { total = $2 } $1 == "Now" && now == "" { now = $2 } END { if (total != "" && now != "") print "CAPTURE_STATS main total=" total " now=" now }' >> "$file"
}

capture_follow() {
  local file="$out/boot-logcat.txt" end
  end=$(($(date +%s) + $1))
  (
    while [ "$(date +%s)" -lt $end ]; do
      echo "CAPTURE_SEGMENT start $(date +%s)"
      timeout -k 5 $((end - $(date +%s))) adb logcat -v epoch -b main
      timeout -k 5 20 adb wait-for-device
      sleep 1
    done
  ) >> "$file" 2>&1 &
  capture=$!
}

stop_capture() {
  [ -n "${capture:-}" ] || return 0
  local readers
  readers=$(pgrep -P "$capture")
  kill "$capture" $readers 2>/dev/null
  capture=
}

# The prep's adb calls outside its other stages, in groups that each run under a cap of their own.
hide_dialogs() {
  a shell settings put global hide_error_dialogs 1 || fail "hide error dialogs"
}

device_settings() {
  # Make Chrome skip its first-run screens. Non-root Chrome reads this file only when it is the debug app.
  log "chrome flags"
  a shell am set-debug-app --persistent com.android.chrome || fail "chrome debug app"
  a shell 'echo "_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo" > /data/local/tmp/chrome-command-line' || fail "chrome command line"
  a shell cat /data/local/tmp/chrome-command-line

  log "soft keyboard"
  a shell settings put secure show_ime_with_hard_keyboard 1 || fail "soft keyboard"
  a shell settings get secure show_ime_with_hard_keyboard
}

serve_to_device() {
  log "logcat"
  a logcat -c
  curl -sf --max-time 2 --retry 2 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8765/editor.html || fail "http server, see http.log"
  log "http ok"
  a reverse tcp:8765 tcp:8765 || fail "adb reverse"
  a reverse --list
}

prep() {
  log "boot capture"
  trap stop_capture EXIT
  stage 15 capture_seed || exit 1
  capture_follow 900
  # Play services runs a startup storm after boot. Chrome depends on its font provider and gets killed
  # when it ANRs, so wait until the system has been free of ANRs for 30s. No iteration starts after 240s,
  # so the settle ends within about 285s, and the prep deadline bounds it in any case.
  # Late ANRs (system, launcher) still pop a dialog that takes window focus. Suppress the dialogs.
  stage 10 hide_dialogs || exit 1
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

  stage 10 device_settings || exit 1

  if [ "$lang" = ja ]; then
    log "japanese setup"
    timeout -k 10 240 node scripts/setup-ja.ts "$out" 2>&1 | tee -a "$out/ja-setup.log"
    rc=${PIPESTATUS[0]}
    log "japanese setup rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese setup, see ja-setup.log"

    # A Mozc session Gboard creates before its dictionary loads never converts, so wait for the load and
    # check that a switch after it converts. A prep that ran past the bound still reads the capture once.
    wait_seconds=$((booted + DICTIONARY_LOAD_SECONDS - $(date +%s)))
    [ $wait_seconds -gt 0 ] || wait_seconds=0
    log "japanese dictionary wait"
    timeout -k 5 $((wait_seconds + 45)) node scripts/dictionary.ts wait "$out" "$booted" 2>&1 | tee -a "$out/ja-dictionary.log"
    rc=${PIPESTATUS[0]}
    log "japanese dictionary wait rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese dictionary never loaded, see ja-dictionary.log"
    log "japanese dictionary check"
    timeout -k 10 180 node scripts/dictionary.ts check "$out" 2>&1 | tee -a "$out/ja-dictionary.log"
    rc=${PIPESTATUS[0]}
    log "japanese dictionary check rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese dictionary check, see ja-dictionary.log"
  fi
  stop_capture
  stage 15 serve_to_device || exit 1
}

booted=$(date +%s)
echo "BOOTED at $booted" | tee -a "$out/timing.txt"
# The suite's cap follows from the file's number of tests. A file that cannot be read fails before any
# device work.
suite_seconds=$(timeout -k 5 20 node scripts/suite-seconds.ts "$file") || fail "count tests in $file"
log "suite cap ${suite_seconds}s for $file"
# Spike: the page's and the editor's source maps, so `scripts/map-stack.ts` can map the stacks a `timing=1`
# page logs from the artifact alone.
mkdir -p "$out/sourcemaps/page" "$out/sourcemaps/editor-lib"
cp dist/assets/*.map "$out/sourcemaps/page/"
(cd ../../packages/editor/lib && find . -name '*.js.map' -exec cp --parents {} "$OLDPWD/$out/sourcemaps/editor-lib/" \;)
log "http server"
node scripts/serve.ts dist 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

# One deadline for the whole prep. `prep` runs in a subshell, so its `fail` exits only the subshell.
export -f prep stage capture_seed capture_follow stop_capture hide_dialogs device_settings serve_to_device log a fail
export lang out booted DICTIONARY_LOAD_SECONDS
timeout -k 10 900 bash -c prep
rc=$?
[ $rc -eq 124 ] && log "PREP FAILED: prep ran past 900s"
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
