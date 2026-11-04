#!/usr/bin/env bash
# Prepares a booted emulator for `typeOnDevice`. `thumbjar prepare` runs it with THUMBJAR_KEYBOARD,
# THUMBJAR_OUT_DIR, THUMBJAR_PAGE_URL, THUMBJAR_PAGE_PORT and THUMBJAR_BOOTED set, the port from the
# driver's `localhostPort` and empty when the page is not on localhost, and THUMBJAR_BOOTED the host's epoch
# seconds when the emulator came online. A prep step that breaks exits with a PREP FAILED line naming the
# step.
# The prep runs under one deadline, `timeout -k 10 "$deadline"`, so it ends within `prepWorstSeconds` of
# its keyboard in `src/device/budget.ts`, 632 seconds for English and 889 for Japanese, its boot capture
# included, however the device hangs.
set -u
lang=$THUMBJAR_KEYBOARD
out=$THUMBJAR_OUT_DIR
page_url=$THUMBJAR_PAGE_URL
port=$THUMBJAR_PAGE_PORT
booted=$THUMBJAR_BOOTED
here=$(cd "$(dirname "$0")" && pwd)
# How long after the emulator came online Gboard gets to load its Japanese dictionary, `DICTIONARY_LOAD_SECONDS`
# in `src/device/budget.ts`.
DICTIONARY_LOAD_SECONDS=360
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
a() { timeout -k 5 60 adb "$@"; local rc=$?; [ $rc -eq 124 ] && log "TIMEOUT adb $*"; return $rc; }
fail() { log "PREP FAILED: $*"; exit 1; }
# Fails the prep with the reason the dictionary wait printed, so the caller's summary can quote it.
dictionary_failure() {
  local reason
  reason=$(grep -m 1 '^DICTIONARY FAILED: ' "$out/ja-dictionary.log" 2>/dev/null)
  [ -n "$reason" ] || fail "japanese dictionary wait gave no reason, see ja-dictionary.log"
  fail "${reason#DICTIONARY FAILED: } See ja-dictionary.log for the dictionary lines it saw."
}

# Gboard's `main` log from this boot, where it logs its dictionary load and session rebuilds, for the Japanese
# dictionary wait. The header ties the file to the boot, so a file from an earlier boot or one left behind never
# passes for this one, and `src/gboard/dictionary.ts` reads only lines from after the boot time. logd's line
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

# Reads `main` into the capture until stopped, starting a reader adb dropped again.
capture_loop() {
  while :; do
    echo "CAPTURE_SEGMENT start $(date +%s)"
    adb logcat -v epoch -b main
    timeout -k 5 20 adb wait-for-device
    sleep 1
  done
}

# Ends the capture's process group, the loop and its readers, however they treat SIGTERM: TERM, up to 2
# seconds for the group to empty, then KILL and up to 1 second more for it to empty. The prep calls it once
# the dictionary is checked, and this script again on every exit.
stop_capture() {
  [ -n "${reader:-}" ] || return 0
  kill -TERM -- "-$reader" 2>/dev/null
  local tick
  for tick in 1 2 3 4 5 6 7 8 9 10; do
    capture_alive || return 0
    sleep 0.2
  done
  kill -KILL -- "-$reader" 2>/dev/null
  for tick in 1 2 3 4 5; do
    capture_alive || return 0
    sleep 0.2
  done
}

# Whether a process of the capture's group still runs. A reader this script has not reaped yet is no
# longer running. `setsid` makes the group a session of its own, and `ps -g` selects a session.
capture_alive() {
  local state
  for state in $(ps -o stat= -g "$reader" 2>/dev/null); do
    [ "${state#Z}" = "$state" ] && return 0
  done
  return 1
}

# Play Store updates Play services, Chrome, WebView and Gboard on its own from about 150 seconds after boot, and
# installing Play services kills Chrome mid-test. Gboard downloads its Japanese dictionary itself, not through
# Play Store, so the prep disables Play Store for the run. A block that fails is logged, never a prep failure.
block_self_update() {
  local output rc disable listed="does not list"
  output=$(timeout -k 1 8 adb shell pm disable-user --user 0 com.android.vending 2>&1)
  rc=$?
  output=$(printf '%s' "$output" | tr -d '\r' | tr '\n' ' ')
  output=${output% }
  if [ $rc -eq 0 ]; then
    disable=succeeded
  elif [ $rc -eq 124 ] || [ $rc -eq 137 ]; then
    disable="failed (no answer within 8s)"
  else
    disable="failed (exit $rc: $output)"
  fi
  timeout -k 1 8 adb shell pm list packages -d com.android.vending 2>/dev/null | tr -d '\r' | grep -qx 'package:com.android.vending' && listed=lists
  log "self-update block: disabling com.android.vending $disable, pm list packages -d $listed it"
}

prep() {
  # Play services runs a startup storm after boot. Chrome depends on its font provider and gets killed
  # when it ANRs, so wait until the system has been free of ANRs for 30s. No iteration starts after 240s,
  # so the settle ends within about 285s, and the prep deadline bounds it in any case.
  # Late ANRs (system, launcher) still pop a dialog that takes window focus. Suppress the dialogs.
  a shell settings put global hide_error_dialogs 1 || fail "hide error dialogs"
  timeout -k 2 20 bash -c block_self_update || log "self-update block: ran past 20s"
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
  timeout -k 5 60 "$here/diagnose.sh" "$out" || log "diagnose rc=$?"

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
    timeout -k 10 240 node "$here/setup-ja.js" "$out" 2>&1 | tee -a "$out/ja-setup.log"
    rc=${PIPESTATUS[0]}
    log "japanese setup rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese setup, see ja-setup.log"

    # A Mozc session Gboard creates before its dictionary loads never converts, so wait for the load and
    # check that a switch after it converts. A prep that ran past the bound still reads the capture once.
    wait_seconds=$((booted + DICTIONARY_LOAD_SECONDS - $(date +%s)))
    [ $wait_seconds -gt 0 ] || wait_seconds=0
    log "japanese dictionary wait"
    timeout -k 5 $((wait_seconds + 45)) node "$here/dictionary.js" wait "$out" "$booted" 2>&1 | tee -a "$out/ja-dictionary.log"
    rc=${PIPESTATUS[0]}
    log "japanese dictionary wait rc=$rc"
    [ "$rc" -eq 0 ] || dictionary_failure
    log "japanese dictionary check"
    timeout -k 10 180 node "$here/dictionary.js" check "$out" "$page_url" 2>&1 | tee -a "$out/ja-dictionary.log"
    rc=${PIPESTATUS[0]}
    log "japanese dictionary check rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese dictionary check, see ja-dictionary.log"
    stop_capture
  fi

  log "logcat"
  a logcat -c
  curl -sf --max-time 5 --retry 5 --retry-connrefused --retry-delay 1 -o /dev/null "$page_url" || fail "http server, see http.log"
  log "http ok"
  if [ -n "$port" ]; then
    a reverse "tcp:$port" "tcp:$port" || fail "adb reverse"
    a reverse --list
  fi
}

# The prep's deadline, `prepWorstSeconds` less its kill-after, and for Japanese less its boot capture, which
# runs before it.
case "$lang" in
  ja) deadline=862 ;;
  *) deadline=622 ;;
esac

export -f prep log a fail dictionary_failure capture_seed capture_loop stop_capture capture_alive block_self_update
export lang out page_url port here booted DICTIONARY_LOAD_SECONDS

if [ "$lang" = ja ]; then
  log "boot capture"
  timeout -k 2 15 bash -c capture_seed || fail "boot capture ran past 15s or failed"
  # The reader runs in a process group of its own, so this script can end it and every reader it started on
  # any exit, the prep's deadline included, once that deadline killed the prep.
  setsid bash -c capture_loop >> "$out/boot-logcat.txt" 2>&1 &
  reader=$!
  export reader
  trap 'stop_capture; wait "$reader" 2>/dev/null' EXIT
fi
# A prep stopped from outside stops its own stages and, through the EXIT trap, the capture.
trap '[ -n "${prep_pid:-}" ] && kill -TERM "$prep_pid" 2>/dev/null; exit 143' TERM
trap '[ -n "${prep_pid:-}" ] && kill -TERM "$prep_pid" 2>/dev/null; exit 130' INT

# One deadline for the whole prep. `prep` runs in a subshell, so its `fail` exits only the subshell. It
# runs in the background so a signal to this script interrupts the `wait`.
timeout -k 10 "$deadline" bash -c prep &
prep_pid=$!
wait "$prep_pid"
rc=$?
[ $rc -eq 124 ] && log "PREP FAILED: prep ran past ${deadline}s"
[ $rc -eq 0 ] || exit 1
