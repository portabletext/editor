#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Usage: IME_LANG=ja scripts/run-on-device.sh tests/ja.test.ts
# Prepares the device for IME_LANG, then runs the one device test file given. A prep step that breaks
# exits before any test runs, with a PREP FAILED line naming the step and the file's summary line. That line
# counts each test as device offline when the prep's output shows adb lost the device or one `adb get-state`
# after the failure does not answer `device`, and otherwise names the PREP FAILED line.
# Every stage runs under `timeout -k`, so a hang shows up as a logged timeout and the stage ends within
# its cap plus the kill-after: counting the tests 20 + 5 seconds, prep 925 + 10, the tests the file's cap from
# `scripts/suite-seconds.ts` + 10, the diagnostics after them 60 + 5. After a failed prep, which skips the
# tests, the prep log's last lines take 5, `adb get-state` 5 + 2 and the summary line 20 + 5. `scripts/lib/budget.ts` holds these
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
# Fails the prep with the reason the dictionary wait printed, so the job summary names it.
dictionary_failure() {
  local reason
  reason=$(grep -m 1 '^DICTIONARY FAILED: ' "$out/ja-dictionary.log" 2>/dev/null)
  [ -n "$reason" ] || fail "japanese dictionary wait gave no reason, see ja-dictionary.log"
  fail "japanese dictionary wait: ${reason#DICTIONARY FAILED: } See ja-dictionary.log"
}

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

# Play Store updates Play services, Chrome, WebView and Gboard on its own from about 150 seconds after boot, and
# installing Play services kills Chrome mid-test. Gboard downloads its Japanese dictionary itself, not through
# Play Store, so the prep disables Play Store for the job. A block that fails is a warning, not a prep failure.
block_self_update() {
  local output disable=failed listed="does not list"
  output=$(timeout -k 1 8 adb shell pm disable-user --user 0 com.android.vending 2>&1) && disable=succeeded
  timeout -k 1 8 adb shell pm list packages -d com.android.vending 2>/dev/null | tr -d '\r' | grep -qx 'package:com.android.vending' && listed=lists
  output=$(printf '%s' "$output" | tr -d '\r' | tr '\n' ' ')
  log "self-update block: pm disable-user com.android.vending $disable, pm list packages -d $listed it: ${output% }"
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
  # Reads for as long as the prep may run, `PREP_SECONDS`.
  capture_follow 925
  # Play services runs a startup storm after boot. Chrome depends on its font provider and gets killed
  # when it ANRs, so wait until the system has been free of ANRs for 30s. No iteration starts after 240s,
  # so the settle ends within `SETTLE_SECONDS` in `scripts/lib/budget.ts`, and the prep deadline bounds it in any case.
  # Late ANRs (system, launcher) still pop a dialog that takes window focus. Suppress the dialogs.
  stage 10 hide_dialogs || exit 1
  timeout -k 2 20 bash -c block_self_update || log "self-update block: WARNING, ran past 20s"
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
    [ "$rc" -eq 0 ] || dictionary_failure
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
# The suite's cap follows from the file's number of tests, `suiteSeconds` in `scripts/lib/budget.ts`. A file
# that cannot be read fails before any device work.
tests_seconds=$(timeout -k 5 20 node scripts/suite-seconds.ts "$file") || fail "count tests in $file"
[[ $tests_seconds =~ ^[0-9]+$ ]] || fail "read the test stage timeout of $file from scripts/lib/budget.ts"
log "suite cap ${tests_seconds}s for $file"
log "http server"
node scripts/serve.ts dist 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

# One deadline for the whole prep. `prep` runs in a subshell, so its `fail` exits only the subshell.
export -f prep stage dictionary_failure capture_seed capture_follow stop_capture hide_dialogs block_self_update device_settings serve_to_device log a fail
export lang out booted DICTIONARY_LOAD_SECONDS
rm -f "$out/prep.log" "$out/summary.md"
exec 3> >(tee -a "$out/prep.log")
prep_log=$!
timeout -k 10 925 bash -c prep >&3 2>&1
rc=$?
exec 3>&-
[ $rc -eq 124 ] && log "PREP FAILED: prep ran past 925s"
if [ $rc -ne 0 ]; then
  # A failed prep ran no test. `tee` gets `PREP_LOG_SECONDS` to write the prep's last lines, which only a
  # process of the prep that outlived its kill would hold open. A stage that ran out of time names no adb
  # error, so one `adb get-state` under `DEVICE_STATE_SECONDS` decides whether adb still reaches the device.
  # Only its stdout names the state: adb that starts its server prints that on stderr, which is only logged.
  timeout 5 tail --pid="$prep_log" -f /dev/null
  reason=$(grep -o 'PREP FAILED: .*' "$out/phases.log" | tail -n 1)
  reason=${reason#PREP FAILED: }
  state=$(timeout -k 2 5 adb get-state 2> "$out/get-state-stderr.txt")
  state_rc=$?
  errors=$(tr -d '\r' < "$out/get-state-stderr.txt" | tr '\n' ' ')
  errors=${errors% }
  state=$(printf '%s' "$state" | tr -d '\r' | tr '\n' ' ')
  state=${state% }
  # A failed read names its error, which adb prints on stderr.
  [ $state_rc -ne 0 ] && state=${errors:-$state}
  { [ $state_rc -eq 124 ] || [ $state_rc -eq 137 ]; } && state="ran past 5s"
  log "adb get-state after the failed prep: rc=$state_rc $state"
  [ $state_rc -eq 0 ] && [ -n "$errors" ] && log "adb get-state stderr after the failed prep: $errors"
  if grep -qE 'device offline|error: closed|no devices/emulators found' "$out/prep.log"; then
    kind="adb error"
  elif [ $state_rc -ne 0 ] || [ "$state" != device ]; then
    kind=offline
  else
    kind=answered
  fi
  timeout -k 5 20 node scripts/prep-summary.ts "$file" "$kind" "${reason:-prep rc=$rc}" "$state" > "$out/summary.md" || log "prep summary failed"
  cat "$out/summary.md"
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && cat "$out/summary.md" >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

# Records through the test stage, its kill-after and the diagnostics after it.
(timeout -k 5 $((tests_seconds + 120)) adb logcat -v time > "$out/logcat.txt" 2>&1 &)

log "tests start"
# `tests/setup.ts` writes the file's line of the job summary here, counting inconclusive calls, those whose
# device went offline and driver faults apart from passed and failed tests.
IME_SUMMARY_FILE="$out/summary.md" timeout -k 10 "$tests_seconds" pnpm exec vitest run --project device "$file" < /dev/null 2>&1 | tee -a "$out/vitest.log"
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
installs=$(grep -E 'Force stopping (com\.google\.android\.gms|com\.android\.vending) .*installPackageLI' "$out/logcat.txt" 2>/dev/null | sed -E 's/.*Force stopping ([^ ]+) .*/\1/' | sort | uniq -c | awk '{printf "%s%s x%s", sep, $2, $1; sep = ", "}')
log "self-updates during the tests: ${installs:-none}"
# Gboard loads Play services' `cronet_dynamite` module, which a disable of Play Store that broke Play services
# would stop. Each Gboard process is one nativeloader configures LatinIMEGooglePrebuilt for, in either logcat's format.
logcats=("$out/boot-logcat.txt" "$out/logcat.txt")
gboard_pids=$(cat "${logcats[@]}" 2>/dev/null | grep -E 'for unbundled product apk /product/app/LatinIMEGooglePrebuilt/' | sed -E 's/.*nativeloader\( *([0-9]+)\).*/\1/; s/^ *[0-9.]+ +([0-9]+) .*/\1/' | sort -un)
modules=
for pid in $gboard_pids; do
  loaded="not loaded"
  cat "${logcats[@]}" 2>/dev/null | grep -qE "(DynamiteModule\( *$pid\)|^ *[0-9.]+ +$pid +[0-9]+ I DynamiteModule): Selected remote version of com\.google\.android\.gms\.cronet_dynamite" && loaded=loaded
  modules="${modules:+$modules, }pid $pid $loaded"
done
log "Gboard's Play services cronet_dynamite module: ${modules:-no Gboard process in the logcats}"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
exit $status
